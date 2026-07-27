// @ts-nocheck
// Registry of pre-built bot templates (Kommo exports converted on demand).
import boasVindas from "./templates/boas-vindas.kommo.json";
import { kommoToFlowSchema } from "@/lib/chatbot/kommoImport";
import type { FlowSchema } from "@/lib/chatbot/engine";

// Maps a template card id (see BotTemplatesDialog TEMPLATES) to a Kommo export.
const KOMMO_TEMPLATES: Record<string, any> = {
  "boas-vindas": boasVindas,
};

export function hasTemplateFlow(templateId: string): boolean {
  return templateId in KOMMO_TEMPLATES;
}

/** Returns the converted flow for a template, or null if none is defined yet. */
export function getTemplateFlow(templateId: string): { name: string; schema: FlowSchema } | null {
  const raw = KOMMO_TEMPLATES[templateId];
  if (!raw) return null;
  try {
    return kommoToFlowSchema(raw);
  } catch {
    return null;
  }
}
