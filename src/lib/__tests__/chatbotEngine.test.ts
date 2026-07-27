import { describe, expect, it } from "vitest";
import {
  advance,
  startFlow,
  matchTrigger,
  validateAnswer,
  entryNodeId,
  FALLBACK_HANDLE,
  ELSE_HANDLE,
  OK_HANDLE,
  INVALID_HANDLE,
  type FlowSchema,
  type EngineState,
} from "@/lib/chatbot/engine";

// Small helpers to build graphs concisely
const node = (id: string, type: any, data: any = {}): any => ({ id, type, position: { x: 0, y: 0 }, data });
const edge = (source: string, target: string, sourceHandle?: string): any => ({
  id: `${source}-${target}-${sourceHandle ?? "d"}`,
  source,
  target,
  sourceHandle,
});

describe("chatbot engine — validation", () => {
  it("validates by type", () => {
    expect(validateAnswer("qualquer coisa", "text")).toBe(true);
    expect(validateAnswer("   ", "text")).toBe(false);
    expect(validateAnswer("123", "number")).toBe(true);
    expect(validateAnswer("12,50", "number")).toBe(true);
    expect(validateAnswer("abc", "number")).toBe(false);
    expect(validateAnswer("a@b.com", "email")).toBe(true);
    expect(validateAnswer("a@b", "email")).toBe(false);
    expect(validateAnswer("+55 11 99999-9999", "phone")).toBe(true);
    expect(validateAnswer("hi", "phone")).toBe(false);
  });
});

describe("chatbot engine — start & linear flow", () => {
  it("walks from the trigger through plain messages then ends", () => {
    const schema: FlowSchema = {
      nodes: [
        node("t", "trigger", { triggerType: "new_conversation" }),
        node("m1", "message", { text: "Oi!" }),
        node("m2", "message", { text: "Tudo bem?" }),
        node("end", "end", { handoff: false }),
      ],
      edges: [edge("t", "m1"), edge("m1", "m2"), edge("m2", "end")],
    };

    const res = startFlow(schema);
    expect(res.outbound.map((o) => (o.kind === "send_message" ? o.text : o.kind))).toEqual(["Oi!", "Tudo bem?"]);
    expect(res.ended).toBe(true);
    expect(res.waitingForReply).toBe(false);
  });

  it("finds entry node when there is no explicit trigger", () => {
    const schema: FlowSchema = {
      nodes: [node("a", "message", { text: "x" }), node("b", "message", { text: "y" })],
      edges: [edge("a", "b")],
    };
    expect(entryNodeId(schema)).toBe("a");
  });
});

describe("chatbot engine — message buttons", () => {
  const schema: FlowSchema = {
    nodes: [
      node("t", "trigger", { triggerType: "manual" }),
      node("ask", "message", {
        text: "Escolha:",
        buttons: [
          { id: "b_sim", label: "Sim" },
          { id: "b_nao", label: "Não" },
        ],
      }),
      node("mSim", "message", { text: "Ótimo!" }),
      node("mNao", "message", { text: "Tudo bem." }),
      node("mFall", "message", { text: "Não entendi." }),
    ],
    edges: [
      edge("t", "ask"),
      edge("ask", "mSim", "b_sim"),
      edge("ask", "mNao", "b_nao"),
      edge("ask", "mFall", FALLBACK_HANDLE),
    ],
  };

  it("parks after sending a message with buttons", () => {
    const res = startFlow(schema);
    expect(res.waitingForReply).toBe(true);
    expect(res.state.currentNodeId).toBe("ask");
    expect(res.outbound).toHaveLength(1);
  });

  it("routes by button id", () => {
    const parked = startFlow(schema).state;
    const res = advance(schema, parked, { text: "", buttonId: "b_sim" });
    expect(res.outbound[0]).toMatchObject({ text: "Ótimo!" });
    expect(res.ended).toBe(true);
  });

  it("routes by button label when no id given", () => {
    const parked = startFlow(schema).state;
    const res = advance(schema, parked, { text: "não" });
    expect(res.outbound[0]).toMatchObject({ text: "Tudo bem." });
  });

  it("uses the fallback branch for unrecognised replies", () => {
    const parked = startFlow(schema).state;
    const res = advance(schema, parked, { text: "blablabla" });
    expect(res.outbound[0]).toMatchObject({ text: "Não entendi." });
  });
});

describe("chatbot engine — question capture & validation", () => {
  const schema: FlowSchema = {
    nodes: [
      node("t", "trigger", { triggerType: "manual" }),
      node("q", "question", { text: "Seu email?", variable: "email", validation: "email" }),
      node("ok", "message", { text: "Obrigado!" }),
      node("bad", "message", { text: "Email inválido, tente de novo." }),
    ],
    edges: [edge("t", "q"), edge("q", "ok", OK_HANDLE), edge("q", "bad", INVALID_HANDLE)],
  };

  it("sends the question and waits", () => {
    const res = startFlow(schema);
    expect(res.outbound[0]).toMatchObject({ text: "Seu email?" });
    expect(res.waitingForReply).toBe(true);
  });

  it("stores the variable and takes the ok branch on valid input", () => {
    const parked = startFlow(schema).state;
    const res = advance(schema, parked, { text: "user@site.com" });
    expect(res.state.vars.email).toBe("user@site.com");
    expect(res.outbound[0]).toMatchObject({ text: "Obrigado!" });
  });

  it("takes the invalid branch and does not store on invalid input", () => {
    const parked = startFlow(schema).state;
    const res = advance(schema, parked, { text: "not-an-email" });
    expect(res.state.vars.email).toBeUndefined();
    expect(res.outbound[0]).toMatchObject({ text: "Email inválido, tente de novo." });
  });
});

describe("chatbot engine — conditions", () => {
  const schema: FlowSchema = {
    nodes: [
      node("t", "trigger", { triggerType: "manual" }),
      node("c", "condition", {
        rules: [{ id: "r1", variable: "plano", operator: "equals", value: "premium" }],
      }),
      node("vip", "message", { text: "Bem-vindo VIP" }),
      node("normal", "message", { text: "Bem-vindo" }),
    ],
    edges: [edge("t", "c"), edge("c", "vip", "r1"), edge("c", "normal", ELSE_HANDLE)],
  };

  it("takes the matching rule branch", () => {
    const state: EngineState = { currentNodeId: null, vars: { plano: "premium" } };
    const res = advance(schema, state, null);
    expect(res.outbound[0]).toMatchObject({ text: "Bem-vindo VIP" });
  });

  it("falls to else when no rule matches", () => {
    const state: EngineState = { currentNodeId: null, vars: { plano: "basic" } };
    const res = advance(schema, state, null);
    expect(res.outbound[0]).toMatchObject({ text: "Bem-vindo" });
  });
});

describe("chatbot engine — actions, wait, goto", () => {
  it("emits action outbound and continues", () => {
    const schema: FlowSchema = {
      nodes: [
        node("t", "trigger", { triggerType: "manual" }),
        node("a", "action", { actionType: "change_stage", params: { stageId: "stage-2" } }),
        node("m", "message", { text: "movido" }),
        node("e", "end", {}),
      ],
      edges: [edge("t", "a"), edge("a", "m"), edge("m", "e")],
    };
    const res = startFlow(schema);
    expect(res.outbound[0]).toEqual({ kind: "change_stage", stageId: "stage-2" });
    expect(res.outbound[1]).toMatchObject({ kind: "send_message", text: "movido" });
  });

  it("delay wait parks by default and resumes; skipDelay continues inline", () => {
    const delaySchema: FlowSchema = {
      nodes: [
        node("t", "trigger", { triggerType: "manual" }),
        node("w", "wait", { mode: "delay", durationSeconds: 30 }),
        node("m", "message", { text: "depois" }),
      ],
      edges: [edge("t", "w"), edge("w", "m")],
    };
    // Default: parks on the timer (no "depois" yet)
    const parkedTimer = startFlow(delaySchema);
    expect(parkedTimer.waitingForTimer).toBe(true);
    expect(parkedTimer.delaySeconds).toBe(30);
    expect(parkedTimer.state.currentNodeId).toBe("w");
    expect(parkedTimer.outbound.find((o: any) => o.kind === "send_message")).toBeUndefined();
    // Scheduler resume: advancing from the delay node sends "depois"
    const resumedTimer = advance(delaySchema, parkedTimer.state, { text: "" });
    expect(resumedTimer.outbound[0]).toMatchObject({ text: "depois" });

    // skipDelay (preview): continues inline
    const inline = startFlow(delaySchema, {}, { skipDelay: true });
    expect(inline.outbound[0]).toEqual({ kind: "wait_delay", seconds: 30 });
    expect(inline.outbound[1]).toMatchObject({ text: "depois" });

    const replySchema: FlowSchema = {
      nodes: [
        node("t", "trigger", { triggerType: "manual" }),
        node("w", "wait", { mode: "reply" }),
        node("m", "message", { text: "recebi" }),
      ],
      edges: [edge("t", "w"), edge("w", "m")],
    };
    const parked = startFlow(replySchema);
    expect(parked.waitingForReply).toBe(true);
    const resumed = advance(replySchema, parked.state, { text: "oi" });
    expect(resumed.outbound[0]).toMatchObject({ text: "recebi" });
  });

  it("handoff on end emits a handoff action", () => {
    const schema: FlowSchema = {
      nodes: [node("t", "trigger", { triggerType: "manual" }), node("e", "end", { handoff: true })],
      edges: [edge("t", "e")],
    };
    const res = startFlow(schema);
    expect(res.outbound).toContainEqual({ kind: "handoff" });
    expect(res.ended).toBe(true);
  });

  it("does not loop forever on a goto cycle", () => {
    const schema: FlowSchema = {
      nodes: [
        node("t", "trigger", { triggerType: "manual" }),
        node("g", "goto", { targetNodeId: "g" }),
      ],
      edges: [edge("t", "g")],
    };
    const res = startFlow(schema);
    expect(res.ended).toBe(true); // bailed via step cap
  });
});

describe("chatbot engine — trigger matching", () => {
  const keywordFlow: FlowSchema = {
    nodes: [node("t", "trigger", { triggerType: "keyword", keywords: ["orçamento", "preço"], matchMode: "contains" })],
    edges: [],
  };

  it("matches keyword triggers by substring", () => {
    expect(matchTrigger(keywordFlow, { text: "quero um ORÇAMENTO por favor" })).toBe(true);
    expect(matchTrigger(keywordFlow, { text: "bom dia" })).toBe(false);
  });

  it("matches new_conversation and stage_entry events", () => {
    const nc: FlowSchema = { nodes: [node("t", "trigger", { triggerType: "new_conversation" })], edges: [] };
    expect(matchTrigger(nc, { event: "new_conversation" })).toBe(true);
    expect(matchTrigger(nc, { event: "message" })).toBe(false);

    const se: FlowSchema = { nodes: [node("t", "trigger", { triggerType: "stage_entry", stageId: "s1" })], edges: [] };
    expect(matchTrigger(se, { event: "stage_entry", stageId: "s1" })).toBe(true);
    expect(matchTrigger(se, { event: "stage_entry", stageId: "s2" })).toBe(false);
  });

  it("manual triggers never auto-match", () => {
    const m: FlowSchema = { nodes: [node("t", "trigger", { triggerType: "manual" })], edges: [] };
    expect(matchTrigger(m, { text: "qualquer" })).toBe(false);
  });
});
