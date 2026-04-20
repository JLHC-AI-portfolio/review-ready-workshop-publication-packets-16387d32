import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, type Runnable, type RunnableConfig } from "@langchain/core/runnables";

import {
  semanticWorkshopNormalizationSchema,
  type SemanticWorkshopNormalization,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "../contracts.js";

const SYSTEM_PROMPT = `You perform semantic normalization for a workshop publication workflow.

Rules:
- Convert raw request evidence and the prior interpretation into a stable normalized payload.
- Preserve supplied facts and do not invent confirmations, approvals, accessibility claims, age guidance, or weather fallback details.
- You may rewrite labels and summaries for clarity, but unresolved facts must stay visible.
- Capture missing facts, contradictions, and constraints only when supplied evidence explicitly shows a missing, tentative, unclear, or contradictory detail that matters for publication review.
- Use severity "review_required" only for unresolved facts that must be resolved before publication under the supplied workflow policy.
- Do not create derived constraints from generic best practices, absent optional process details, or hypothetical compliance concerns.
- Capacity alone is not evidence that registration, waitlist, or overcapacity handling is missing.
- Existing age guidance such as "children 8+ with an adult helper" is sufficient unless the request itself says it is tentative or contradictory.
- An empty fallback date or weather plan is not a blocker for an indoor venue.
- Do not ask about fees, health protocols, COVID protocols, waivers, registration, waitlists, or enforcement unless those concerns are explicitly present in the supplied request or prior interpretation.
- If the request says the organizer will bring enough materials or lists material needs, do not ask whether materials are provided.
- Recommended questions should be concrete questions a coordinator can ask before publication, not optional improvement ideas.
- Do not decide whether the packet is approved for publication.`;

interface SemanticNormalizationInput {
  request: WorkshopRequest;
  interpretation: WorkshopRequestInterpretation;
}

export function createSemanticNormalizationChain(
  model: BaseChatModel,
): Runnable<SemanticNormalizationInput, SemanticWorkshopNormalization> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Raw workshop request JSON:
{requestJson}

Prior interpretation JSON:
{interpretationJson}

Return semantic normalization structured output that matches the schema exactly.`,
    ],
  ]);

  const structuredModel = model.withStructuredOutput<SemanticWorkshopNormalization>(
    semanticWorkshopNormalizationSchema,
    {
      name: "workshop_semantic_normalization",
    },
  );

  return RunnableLambda.from<SemanticNormalizationInput, SemanticWorkshopNormalization>(
    async (input: SemanticNormalizationInput, config?: RunnableConfig) => {
      const messages = await prompt.formatMessages({
        requestJson: JSON.stringify(input.request, null, 2),
        interpretationJson: JSON.stringify(input.interpretation, null, 2),
      });

      return semanticWorkshopNormalizationSchema.parse(
        await structuredModel.invoke(messages, config),
      );
    },
  ).withConfig({ runName: "semantic_normalization_chain" });
}
