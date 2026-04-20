import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import type { ProviderDescriptor } from "../contracts.js";

export type AiStepName =
  | "interpret_request"
  | "semantic_normalization"
  | "draft_publication"
  | "policy_analysis";

export interface LangChainModelRuntime {
  descriptor: ProviderDescriptor;
  createChatModel(stepName: AiStepName): BaseChatModel;
}

const DEFAULT_TEMPERATURE_BY_STEP: Record<AiStepName, number> = {
  interpret_request: 0.1,
  semantic_normalization: 0.1,
  draft_publication: 0.2,
  policy_analysis: 0.1,
};

const TEMPERATURE_ENV_BY_STEP: Record<AiStepName, string> = {
  interpret_request: "OPENAI_INTERPRETATION_TEMPERATURE",
  semantic_normalization: "OPENAI_SEMANTIC_NORMALIZATION_TEMPERATURE",
  draft_publication: "OPENAI_DRAFTING_TEMPERATURE",
  policy_analysis: "OPENAI_POLICY_ANALYSIS_TEMPERATURE",
};

export async function createOpenAILangChainModelRuntime(
  env: NodeJS.ProcessEnv = process.env,
): Promise<LangChainModelRuntime> {
  const model = env.OPENAI_MODEL;

  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required when --provider openai is selected.",
    );
  }

  if (!model) {
    throw new Error(
      "OPENAI_MODEL is required when --provider openai is selected.",
    );
  }

  const { ChatOpenAI } = await import("@langchain/openai");

  return {
    descriptor: {
      provider: "openai",
      model,
    },
    createChatModel(stepName) {
      return new ChatOpenAI({
        apiKey: env.OPENAI_API_KEY,
        model,
        temperature: readTemperature(env, stepName),
        metadata: {
          ls_provider: "openai",
          ls_model_name: model,
          workflowStep: stepName,
        },
        tags: ["openai", stepName],
      });
    },
  };
}

function readTemperature(env: NodeJS.ProcessEnv, stepName: AiStepName): number {
  const rawTemperature =
    env[TEMPERATURE_ENV_BY_STEP[stepName]] ??
    env.OPENAI_TEMPERATURE ??
    String(DEFAULT_TEMPERATURE_BY_STEP[stepName]);
  const temperature = Number(rawTemperature);

  if (!Number.isFinite(temperature)) {
    throw new Error(
      `${TEMPERATURE_ENV_BY_STEP[stepName]} must be a finite number when supplied.`,
    );
  }

  return temperature;
}
