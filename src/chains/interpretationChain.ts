import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, type Runnable, type RunnableConfig } from "@langchain/core/runnables";

import {
  workshopRequestInterpretationSchema,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "../contracts.js";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

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

export function createWorkshopRequestInterpretationChain(
  model: BaseChatModel,
): Runnable<WorkshopRequest, WorkshopRequestInterpretation> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Raw workshop request JSON:
{requestJson}

Return structured output that matches the schema exactly.`,
    ],
  ]);

  const structuredModel = model.withStructuredOutput<WorkshopRequestInterpretation>(
    workshopRequestInterpretationSchema,
    {
      name: "workshop_request_interpretation",
    },
  );

  return RunnableLambda.from<WorkshopRequest, WorkshopRequestInterpretation>(
    async (request: WorkshopRequest, config?: RunnableConfig) => {
      const messages = await prompt.formatMessages({
        requestJson: JSON.stringify(request, null, 2),
      });

      return workshopRequestInterpretationSchema.parse(
        await structuredModel.invoke(messages, config),
      );
    },
  ).withConfig({ runName: "interpret_request_chain" });
}
