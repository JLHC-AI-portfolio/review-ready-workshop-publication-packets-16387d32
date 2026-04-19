import type {
  WorkshopRequest,
  WorkshopRequestInterpretation,
} from "../contracts.js";

export type InterpretationProvider = "deterministic" | "openai";

export interface InterpretationDescriptor {
  provider: InterpretationProvider;
  model?: string;
}

export interface InterpretationService {
  descriptor: InterpretationDescriptor;
  interpret(request: WorkshopRequest): Promise<WorkshopRequestInterpretation>;
}
