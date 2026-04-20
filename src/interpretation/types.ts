import type { RunnableConfig } from "@langchain/core/runnables";

import type {
  ProviderDescriptor,
  WorkshopRequest,
  WorkshopRequestInterpretation,
} from "../contracts.js";

export type InterpretationProvider = "deterministic" | "openai";

export type InterpretationDescriptor = ProviderDescriptor;

export interface InterpretationService {
  descriptor: InterpretationDescriptor;
  interpret(
    request: WorkshopRequest,
    config?: RunnableConfig,
  ): Promise<WorkshopRequestInterpretation>;
}
