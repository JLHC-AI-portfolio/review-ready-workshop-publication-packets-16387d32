import type { DraftOutput, NormalizedWorkshopRequest } from "../contracts.js";

export type DraftProvider = "deterministic" | "openai";

export interface DraftingDescriptor {
  provider: DraftProvider;
  model?: string;
}

export interface DraftingService {
  descriptor: DraftingDescriptor;
  draft(request: NormalizedWorkshopRequest): Promise<DraftOutput>;
}
