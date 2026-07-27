// @ts-nocheck
import { describe, it, expect } from "vitest";
import boasVindas from "@/lib/chatbot/templates/boas-vindas.kommo.json";
import { kommoToFlowSchema } from "@/lib/chatbot/kommoImport";
import { startFlow, advance } from "@/lib/chatbot/engine";

describe("kommo import — Bot de boas-vindas", () => {
  const { name, schema } = kommoToFlowSchema(boasVindas);

  it("keeps the bot name", () => {
    expect(name).toBe("Bot de boas-vindas");
  });

  it("maps blocks to trigger / message / wait / end nodes", () => {
    expect(schema.nodes.some((n) => n.type === "trigger")).toBe(true);
    expect(schema.nodes.filter((n) => n.type === "message").length).toBeGreaterThanOrEqual(5);
    expect(schema.nodes.some((n) => n.type === "wait")).toBe(true);
    expect(schema.nodes.filter((n) => n.type === "end").length).toBeGreaterThanOrEqual(3);
  });

  it("builds the welcome message with 3 buttons + a fallback edge", () => {
    const msg = schema.nodes.find(
      (n) => n.type === "message" && (n.data as any).text.includes("Como podemos ajudar"),
    );
    expect(msg).toBeTruthy();
    expect((msg as any).data.buttons).toHaveLength(3);
    // one edge per button + the fallback (else) edge
    const out = schema.edges.filter((e) => e.source === msg!.id);
    expect(out.length).toBe(4);
    expect(out.some((e) => e.sourceHandle === "__fallback")).toBe(true);
  });

  it("runs end-to-end through the engine (button routing works)", () => {
    const start = startFlow(schema);
    expect(start.waitingForReply).toBe(true);
    expect((start.outbound[0] as any).text).toContain("Como podemos ajudar");
    const buttons = (start.outbound[0] as any).buttons;
    expect(buttons).toHaveLength(3);

    // "Dúvida sobre produto" -> "Em qual produto você tem interesse?"
    const r1 = advance(schema, start.state, { text: "", buttonId: buttons[0].id });
    expect((r1.outbound[0] as any).text).toContain("Em qual produto");

    // "Fale conosco" -> "Um membro da nossa equipe está vindo... conta pra gente"
    const start2 = startFlow(schema);
    const r2 = advance(schema, start2.state, { text: "", buttonId: buttons[2].id });
    expect((r2.outbound[0] as any).text).toContain("equipe está vindo");
  });
});
