import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, type Runnable, type RunnableConfig } from "@langchain/core/runnables";

import {
  policyAnalysisSchema,
  type DraftOutput,
  type NormalizedWorkshopRequest,
  type PolicyAnalysis,
} from "../contracts.js";

const SYSTEM_PROMPT = `You analyze a workshop publication packet for policy and operational review risk.

Rules:
- You may identify findings, evidence, severity, and concrete follow-up questions.
- Do not approve publication and do not override deterministic policy rules.
- Treat missing accessibility, age guidance, weather fallback, registration, safety, and misleading copy as review risks.
- Use severity "review_required" only when supplied evidence explicitly shows a missing, tentative, unclear, or contradictory detail that a coordinator must resolve before publication.
- Do not create review_required findings from generic best practices, absent optional process details, or hypothetical compliance concerns.
- Capacity alone is not evidence that registration, waitlist, or overcapacity handling is missing.
- Existing age guidance such as "children 8+ with an adult helper" is sufficient unless the request itself says it is tentative or contradictory.
- Treat age guidance that is already present as an info finding at most; do not require review just because it should appear in promotional copy.
- An empty fallback date or weather plan is not a review_required issue for an indoor venue.
- Do not flag health, safety, COVID, waiver, or enforcement details unless those concerns are present in the supplied request or semantic constraints.
- Do not flag fees, registration, waitlists, capacity handling, or material availability unless those concerns are explicitly present in the supplied request or semantic constraints as unresolved facts.
- Use only evidence supplied in the normalized request or draft output.
- Keep findings concise and evidence-grounded.`;

interface PolicyAnalysisInput {
  request: NormalizedWorkshopRequest;
  draft: DraftOutput;
}

export function createWorkshopPolicyAnalysisChain(
  model: BaseChatModel,
): Runnable<PolicyAnalysisInput, PolicyAnalysis> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Normalized request JSON:
{requestJson}

Draft output JSON:
{draftJson}

Return policy analysis structured output that matches the schema exactly.`,
    ],
  ]);

  const structuredModel = model.withStructuredOutput<PolicyAnalysis>(
    policyAnalysisSchema,
    {
      name: "workshop_policy_analysis",
    },
  );

  return RunnableLambda.from<PolicyAnalysisInput, PolicyAnalysis>(
    async (input: PolicyAnalysisInput, config?: RunnableConfig) => {
      const messages = await prompt.formatMessages({
        requestJson: JSON.stringify(input.request, null, 2),
        draftJson: JSON.stringify(input.draft, null, 2),
      });

      return policyAnalysisSchema.parse(await structuredModel.invoke(messages, config));
    },
  ).withConfig({ runName: "policy_analysis_chain" });
}
