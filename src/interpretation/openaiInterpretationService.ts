import { ChatPromptTemplate } from "@langchain/core/prompts";

import {
  workshopRequestInterpretationSchema,
  type WorkshopRequest,
} from "../contracts.js";

import type { InterpretationService } from "./types.js";

const SYSTEM_PROMPT = `You interpret workshop request evidence for a publication review workflow.

Rules:
- Do not approve publication and do not override policy.
- Do not invent confirmations, accessibility details, age guidance, weather fallback plans, or policy acknowledgement.
- Use status "confirmed" only when the supplied evidence clearly supports the field.
- Use status "needs_confirmation" for tentative language such as TBD, pending, unknown, confirm, or unclear availability.
- Use status "missing" when the field is blank or absent and the information matters for publication review.
- Use status "not_applicable" only when the field genuinely does not apply, such as weather fallback for an indoor venue.
- Use status "contradictory" when supplied evidence conflicts.
- Keep evidence snippets short and quote only text supplied in the request.
- Put publication blockers in riskSignals with severity "review_required"; use "review_note" for non-blocking observations.
`;

export async function createOpenAIInterpretationService(
  env: NodeJS.ProcessEnv = process.env,
): Promise<InterpretationService> {
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

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Raw workshop request JSON:
{requestJson}

Return structured output that matches the schema exactly.`,
    ],
  ]);

  const llm = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model,
    temperature: Number(env.OPENAI_TEMPERATURE ?? "0.1"),
  });

  const structuredModel = llm.withStructuredOutput(
    workshopRequestInterpretationSchema,
    {
      name: "workshop_request_interpretation",
    },
  );

  return {
    descriptor: {
      provider: "openai",
      model,
    },
    async interpret(request: WorkshopRequest) {
      const messages = await prompt.formatMessages({
        requestJson: JSON.stringify(request, null, 2),
      });

      return workshopRequestInterpretationSchema.parse(
        await structuredModel.invoke(messages),
      );
    },
  };
}
