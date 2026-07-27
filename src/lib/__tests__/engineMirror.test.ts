import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The edge functions consume a byte-for-byte mirror of the engine because the
 * Supabase CLI can't upload files from src/. This test fails if the two drift,
 * comparing everything from the first `export` onward (ignoring the file header).
 */
describe("chatbot engine mirror", () => {
  const fromExport = (p: string) => {
    const content = readFileSync(join(process.cwd(), p), "utf8");
    const idx = content.indexOf("export type FlowNodeType");
    return content.slice(idx).trim();
  };

  it("supabase/functions/_shared/chatbotEngine.ts matches src/lib/chatbot/engine.ts", () => {
    const source = fromExport("src/lib/chatbot/engine.ts");
    const mirror = fromExport("supabase/functions/_shared/chatbotEngine.ts");
    expect(mirror).toBe(source);
  });
});
