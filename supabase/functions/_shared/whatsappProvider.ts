/**
 * WhatsApp provider abstraction.
 *
 * The rest of the backend (webhook, connect, send edge functions) talks to
 * WhatsApp only through the `WhatsAppProvider` interface, so the concrete
 * provider (uazapi today) can be swapped without touching business logic.
 *
 * Configuration comes from Supabase Function secrets:
 *   - UAZAPI_BASE_URL   e.g. https://your-server.uazapi.com
 *   - UAZAPI_ADMIN_TOKEN admin token used to create/list instances
 * The per-instance token is stored in whatsapp_sessions.instance_token.
 *
 * NOTE: uazapi endpoint/field names below follow the v2 docs
 * (https://docs.uazapi.com). Confirm exact shapes against your server version
 * before going live; they are isolated here so any change is a one-file edit.
 */

export interface ConnectResult {
  status: string; // 'connected' | 'connecting' | 'disconnected' | ...
  qrcode?: string; // base64 data URL or raw string, when pairing is needed
  pairCode?: string;
  instanceToken?: string;
  instanceId?: string;
  phoneNumber?: string;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  raw?: unknown;
}

export interface WhatsAppProvider {
  /** Create/register a new instance under the tenant. Returns the instance token. */
  createInstance(name: string): Promise<{ instanceToken: string; instanceId?: string }>;
  /** Start a connection and (usually) return a QR/pair code to scan. */
  connectInstance(instanceToken: string): Promise<ConnectResult>;
  /** Current connection status of an instance. */
  getStatus(instanceToken: string): Promise<ConnectResult>;
  /** Point the instance's webhook at our edge function. */
  setWebhook(instanceToken: string, url: string, events?: string[]): Promise<void>;
  /** Send a plain text message. `to` is the destination phone (E.164, digits only). */
  sendText(instanceToken: string, to: string, text: string): Promise<SendResult>;
  /** Send a media message by URL. */
  sendMedia(
    instanceToken: string,
    to: string,
    media: { type: "image" | "document" | "video" | "audio"; url: string; caption?: string },
  ): Promise<SendResult>;
}

// ---------------------------------------------------------------------------
// uazapi implementation
// ---------------------------------------------------------------------------

class UazapiProvider implements WhatsAppProvider {
  constructor(
    private baseUrl: string,
    private adminToken: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async call(
    path: string,
    opts: { method?: string; token?: string; admin?: boolean; body?: unknown } = {},
  ): Promise<any> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.admin) headers["admintoken"] = this.adminToken;
    if (opts.token) headers["token"] = opts.token;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: opts.method ?? "POST",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`uazapi ${path} -> ${res.status}: ${text}`);
    }
    return json;
  }

  async createInstance(name: string): Promise<{ instanceToken: string; instanceId?: string }> {
    const data = await this.call("/instance/init", { admin: true, body: { name } });
    const instanceToken = data?.instance?.token ?? data?.token;
    const instanceId = data?.instance?.id ?? data?.id;
    if (!instanceToken) throw new Error("uazapi: no instance token returned");
    return { instanceToken, instanceId };
  }

  async connectInstance(instanceToken: string): Promise<ConnectResult> {
    const data = await this.call("/instance/connect", { token: instanceToken });
    const inst = data?.instance ?? data;
    return {
      status: inst?.status ?? "connecting",
      qrcode: inst?.qrcode ?? inst?.qrCode ?? data?.qrcode,
      pairCode: inst?.paircode ?? inst?.pairCode,
      instanceToken,
      instanceId: inst?.id,
      phoneNumber: inst?.phone ?? inst?.owner,
    };
  }

  async getStatus(instanceToken: string): Promise<ConnectResult> {
    const data = await this.call("/instance/status", { method: "GET", token: instanceToken });
    const inst = data?.instance ?? data;
    return {
      status: inst?.status ?? "unknown",
      qrcode: inst?.qrcode,
      instanceToken,
      instanceId: inst?.id,
      phoneNumber: inst?.phone ?? inst?.owner,
    };
  }

  async setWebhook(instanceToken: string, url: string, events?: string[]): Promise<void> {
    await this.call("/webhook", {
      token: instanceToken,
      body: {
        url,
        enabled: true,
        events: events ?? ["messages", "messages_update", "connection"],
      },
    });
  }

  async sendText(instanceToken: string, to: string, text: string): Promise<SendResult> {
    try {
      const data = await this.call("/send/text", { token: instanceToken, body: { number: to, text } });
      return { ok: true, messageId: data?.messageid ?? data?.id ?? data?.key?.id, raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async sendMedia(
    instanceToken: string,
    to: string,
    media: { type: "image" | "document" | "video" | "audio"; url: string; caption?: string },
  ): Promise<SendResult> {
    try {
      const data = await this.call("/send/media", {
        token: instanceToken,
        body: { number: to, type: media.type, file: media.url, text: media.caption ?? "" },
      });
      return { ok: true, messageId: data?.messageid ?? data?.id, raw: data };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}

// ---------------------------------------------------------------------------
// Mock implementation (local dev / tests without a live server)
// ---------------------------------------------------------------------------

class MockProvider implements WhatsAppProvider {
  public sent: Array<{ to: string; text?: string; media?: unknown }> = [];

  async createInstance(): Promise<{ instanceToken: string }> {
    return { instanceToken: "mock-token" };
  }
  async connectInstance(): Promise<ConnectResult> {
    return { status: "connecting", qrcode: "mock-qr", instanceToken: "mock-token" };
  }
  async getStatus(): Promise<ConnectResult> {
    return { status: "connected", instanceToken: "mock-token", phoneNumber: "5511999999999" };
  }
  async setWebhook(): Promise<void> {}
  async sendText(_t: string, to: string, text: string): Promise<SendResult> {
    this.sent.push({ to, text });
    return { ok: true, messageId: `mock_${this.sent.length}` };
  }
  async sendMedia(_t: string, to: string, media: unknown): Promise<SendResult> {
    this.sent.push({ to, media });
    return { ok: true, messageId: `mock_${this.sent.length}` };
  }
}

/**
 * Factory. Returns the configured provider, or a MockProvider when secrets are
 * absent so local invocations don't crash.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  const baseUrl = Deno.env.get("UAZAPI_BASE_URL");
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  if (!baseUrl || !adminToken) {
    console.warn("[whatsappProvider] UAZAPI_BASE_URL/UAZAPI_ADMIN_TOKEN not set — using MockProvider");
    return new MockProvider();
  }
  return new UazapiProvider(baseUrl, adminToken);
}

export { UazapiProvider, MockProvider };
