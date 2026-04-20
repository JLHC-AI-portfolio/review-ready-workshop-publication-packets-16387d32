import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, type Runnable, type RunnableConfig } from "@langchain/core/runnables";

import {
  draftOutputSchema,
  type DraftOutput,
  type NormalizedWorkshopRequest,
} from "../contracts.js";

const SYSTEM_PROMPT = `You prepare reviewed publication copy for low-stakes community workshop listings.

Rules:
- Keep the copy concise and factual.
- Do not invent accessibility confirmations, age guidance, approvals, or weather plans.
- If the request has unresolved details, surface only those evidence-backed unresolved details in reviewNotes or policyConcerns.
- Do not add generic coordinator checks for fees, health protocols, COVID protocols, registration, waitlists, capacity handling, or material availability unless the normalized request explicitly identifies them as missing, tentative, unclear, or contradictory.
- Capacity alone is not evidence that registration or waitlist handling is missing.
- Existing age guidance such as "children 8+ with an adult helper" is sufficient and should be included in public copy rather than treated as a review concern.
- An empty fallback date or weather plan is not a review concern for an indoor venue.
- The bulletin blurb should read naturally for a public listing.
- The newsletter snippet should stay brief enough for a digest.
- The publicSummary can restate the value of the session in one or two sentences.
- ConfidenceNote should explain why a coordinator may still want to review the draft.
`;

export function createWorkshopPublicationDraftingChain(
  model: BaseChatModel,
): Runnable<NormalizedWorkshopRequest, DraftOutput> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Normalized request JSON:
{requestJson}

Return structured output that matches the schema exactly.`,
    ],
  ]);

  const structuredModel = model.withStructuredOutput<DraftOutput>(draftOutputSchema, {
    name: "workshop_publication_draft",
  });

  return RunnableLambda.from<NormalizedWorkshopRequest, DraftOutput>(
    async (request: NormalizedWorkshopRequest, config?: RunnableConfig) => {
      const messages = await prompt.formatMessages({
        requestJson: JSON.stringify(request, null, 2),
      });

      return draftOutputSchema.parse(await structuredModel.invoke(messages, config));
    },
  ).withConfig({ runName: "draft_publication_chain" });
}
