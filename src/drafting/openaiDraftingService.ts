import { ChatPromptTemplate } from "@langchain/core/prompts";

import { draftOutputSchema, type NormalizedWorkshopRequest } from "../contracts.js";

import type { DraftingService } from "./types.js";

const SYSTEM_PROMPT = `You prepare reviewed publication copy for low-stakes community workshop listings.

Rules:
- Keep the copy concise and factual.
- Do not invent accessibility confirmations, age guidance, approvals, or weather plans.
- If the request has unresolved details, surface them in reviewNotes or policyConcerns.
- The bulletin blurb should read naturally for a public listing.
- The newsletter snippet should stay brief enough for a digest.
- The publicSummary can restate the value of the session in one or two sentences.
- ConfidenceNote should explain why a coordinator may still want to review the draft.
`;

export async function createOpenAIDraftingService(
  env: NodeJS.ProcessEnv = process.env,
): Promise<DraftingService> {
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
      `Normalized request JSON:
{requestJson}

Return structured output that matches the schema exactly.`,
    ],
  ]);

  const llm = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model,
    temperature: Number(env.OPENAI_TEMPERATURE ?? "0.2"),
  });

  const structuredModel = llm.withStructuredOutput(draftOutputSchema, {
    name: "workshop_publication_draft",
  });

  return {
    descriptor: {
      provider: "openai",
      model,
    },
    async draft(request: NormalizedWorkshopRequest) {
      const messages = await prompt.formatMessages({
        requestJson: JSON.stringify(request, null, 2),
      });

      return draftOutputSchema.parse(await structuredModel.invoke(messages));
    },
  };
}
