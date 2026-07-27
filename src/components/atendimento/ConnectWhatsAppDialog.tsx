// @ts-nocheck
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, CheckCircle2, RefreshCw, QrCode } from "lucide-react";
import { useWhatsAppSession } from "@/hooks/useWhatsAppSession";

function qrSrc(qrcode: string): string {
  if (!qrcode) return "";
  if (qrcode.startsWith("data:")) return qrcode;
  // base64 without data-uri prefix
  if (/^[A-Za-z0-9+/=\s]+$/.test(qrcode) && qrcode.length > 100) return `data:image/png;base64,${qrcode}`;
  return ""; // not an image (likely a pair code) -> shown as text
}

export function ConnectWhatsAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { session, connected, connect, checkStatus } = useWhatsAppSession();
  const [qr, setQr] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);

  // Start a connection attempt when the dialog opens (unless already connected).
  useEffect(() => {
    if (!open || connected) return;
    connect.mutate(undefined, {
      onSuccess: (data) => {
        setQr(data?.qrcode ?? null);
        setPairCode(data?.pairCode ?? null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Poll live status while waiting for the scan.
  useEffect(() => {
    if (!open || connected) return;
    const t = setInterval(() => checkStatus.mutate(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connected]);

  // Keep the QR fresh if the webhook pushes a new one.
  useEffect(() => {
    if (session?.qr_code) setQr(session.qr_code);
  }, [session?.qr_code]);

  const img = qr ? qrSrc(qr) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" /> Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong> e
            escaneie o código.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 min-h-[280px]">
          {connected ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <p className="font-semibold text-lg">WhatsApp conectado!</p>
              {session?.phone_number && <p className="text-sm text-muted-foreground">{session.phone_number}</p>}
              <Button onClick={() => onOpenChange(false)}>Concluir</Button>
            </div>
          ) : connect.isPending && !qr ? (
            <div className="text-center space-y-3 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mx-auto" />
              <p className="text-sm">Gerando código de conexão…</p>
            </div>
          ) : img ? (
            <div className="text-center space-y-4">
              <div className="p-3 bg-white rounded-xl border inline-block">
                <img src={img} alt="QR Code do WhatsApp" className="w-56 h-56 object-contain" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando leitura…
              </div>
            </div>
          ) : pairCode ? (
            <div className="text-center space-y-3">
              <QrCode className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Código de pareamento:</p>
              <p className="text-3xl font-mono font-bold tracking-widest">{pairCode}</p>
            </div>
          ) : (
            <div className="text-center space-y-3 text-muted-foreground">
              <QrCode className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm">Nenhum código disponível.</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => connect.mutate(undefined, { onSuccess: (d) => { setQr(d?.qrcode ?? null); setPairCode(d?.pairCode ?? null); } })}>
                <RefreshCw className="w-4 h-4" /> Gerar novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
