import { createDeterministicInterpretationService } from "./deterministicInterpretationService.js";
import { createOpenAIInterpretationService } from "./openaiInterpretationService.js";
import type {
  InterpretationProvider,
  InterpretationService,
} from "./types.js";

export async function createInterpretationService(
  provider: InterpretationProvider,
  env: NodeJS.ProcessEnv = process.env,
): Promise<InterpretationService> {
  if (provider === "openai") {
    return createOpenAIInterpretationService(env);
  }

  return createDeterministicInterpretationService();
}
