import { createContext, useContext } from "react";

/**
 * Lets custom flow nodes edit themselves inline (Kommo-style) without polluting
 * node `data` with callbacks. BotEditor provides the implementation (backed by
 * setNodes); nodes consume it via `useNodeEdit()`.
 */
export interface NodeEditApi {
  /** Shallow-merge a patch into the node's data. */
  updateData: (id: string, patch: Record<string, any>) => void;
  /** Delete the node and its edges. */
  remove: (id: string) => void;
}

export const NodeEditContext = createContext<NodeEditApi>({
  updateData: () => {},
  remove: () => {},
});

export const useNodeEdit = () => useContext(NodeEditContext);
