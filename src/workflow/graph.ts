import {
  Annotation,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";

import {
  type DraftOutput,
  type NormalizedWorkshopRequest,
  type PolicyAnalysis,
  type PolicyDecision,
  type PublicationPacket,
  type ReviewOutcome,
  type RunPacket,
  type SemanticWorkshopNormalization,
  type SourceSummary,
  type TraceEvent,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "../contracts.js";
import { normalizeWorkshopRequest } from "../normalization.js";
import { buildOrganizerDigest, buildPublicationPacket, buildReviewOutcome } from "../output.js";
import { evaluatePolicy } from "../policy.js";
import {
  createStepRunnableConfig,
  createWorkflowRunnableConfig,
} from "../runtime/runnableConfig.js";

import type { DraftingService } from "../drafting/types.js";
import type { InterpretationService } from "../interpretation/types.js";
import type { PolicyAnalysisService } from "../policyAnalysis/types.js";
import type { SemanticNormalizationService } from "../semanticNormalization/types.js";

const WorkflowState = Annotation.Root({
  requestEvidence: Annotation<WorkshopRequest>(),
  requestInterpretation: Annotation<WorkshopRequestInterpretation>(),
  semanticNormalization: Annotation<SemanticWorkshopNormalization>(),
  normalizedRequest: Annotation<NormalizedWorkshopRequest>(),
  draftOutput: Annotation<DraftOutput>(),
  policyAnalysis: Annotation<PolicyAnalysis>(),
  policyDecision: Annotation<PolicyDecision>(),
  reviewOutcome: Annotation<ReviewOutcome>(),
  publicationPacket: Annotation<PublicationPacket>(),
  organizerDigest: Annotation<string>(),
  trace: Annotation<TraceEvent[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});

interface WorkflowDependencies {
  interpreter: InterpretationService;
  semanticNormalizer: SemanticNormalizationService;
  drafter: DraftingService;
  policyAnalyzer: PolicyAnalysisService;
}

export async function runWorkshopPublicationWorkflow(input: {
  request: WorkshopRequest;
  sourceSummary: SourceSummary;
  interpreter: InterpretationService;
  semanticNormalizer: SemanticNormalizationService;
  drafter: DraftingService;
  policyAnalyzer: PolicyAnalysisService;
  config?: RunnableConfig;
}): Promise<RunPacket> {
  const graph = createWorkshopPublicationGraph({
    interpreter: input.interpreter,
    semanticNormalizer: input.semanticNormalizer,
    drafter: input.drafter,
    policyAnalyzer: input.policyAnalyzer,
  });

  const generatedAt = new Date().toISOString();
  const runId = `${input.request.requestId}-${generatedAt.replaceAll(/[:.]/g, "-")}`;
  const graphConfig = createWorkflowRunnableConfig({
    runId,
    request: input.request,
    sourceSummary: input.sourceSummary,
    interpreter: input.interpreter.descriptor,
    semanticNormalizer: input.semanticNormalizer.descriptor,
    drafter: input.drafter.descriptor,
    policyAnalyzer: input.policyAnalyzer.descriptor,
  }, input.config);
  const result = await graph.invoke(
    {
      requestEvidence: input.request,
      trace: [
        createTraceEvent(
          "source.load",
          `Loaded request ${input.request.requestId} from ${input.sourceSummary.label}.`,
          "completed",
        ),
      ],
    },
    graphConfig,
  );

  return {
    runId,
    generatedAt,
    sourceSummary: input.sourceSummary,
    drafter: input.drafter.descriptor,
    interpreter: input.interpreter.descriptor,
    semanticNormalizer: input.semanticNormalizer.descriptor,
    policyAnalyzer: input.policyAnalyzer.descriptor,
    requestEvidence: input.request,
    requestInterpretation: result.requestInterpretation,
    semanticNormalization: result.semanticNormalization,
    normalizedRequest: result.normalizedRequest,
    draftOutput: result.draftOutput,
    policyAnalysis: result.policyAnalysis,
    policyDecision: result.policyDecision,
    reviewOutcome: result.reviewOutcome,
    publicationPacket: result.publicationPacket,
    organizerDigest: result.organizerDigest,
    trace: result.trace,
  };
}

function createWorkshopPublicationGraph(deps: WorkflowDependencies) {
  const interpretRequest = async (
    state: typeof WorkflowState.State,
    config?: RunnableConfig,
  ) => {
    const stepConfig = createStepRunnableConfig(config, "interpret_request", {
      provider: deps.interpreter.descriptor.provider,
      model: deps.interpreter.descriptor.model,
    });
    const requestInterpretation = await deps.interpreter.interpret(
      state.requestEvidence,
      stepConfig,
    );

    return {
      requestInterpretation,
      trace: [
        createTraceEvent(
          "interpret_request",
          `Interpreted request ${state.requestEvidence.requestId} with provider ${deps.interpreter.descriptor.provider}.`,
          "completed",
        ),
      ],
    };
  };

  const semanticNormalize = async (
    state: typeof WorkflowState.State,
    config?: RunnableConfig,
  ) => {
    const stepConfig = createStepRunnableConfig(config, "semantic_normalization", {
      provider: deps.semanticNormalizer.descriptor.provider,
      model: deps.semanticNormalizer.descriptor.model,
    });
    const semanticNormalization = await deps.semanticNormalizer.normalize(
      state.requestEvidence,
      state.requestInterpretation,
      stepConfig,
    );

    return {
      semanticNormalization,
      trace: [
        createTraceEvent(
          "semantic_normalization",
          `Built semantic normalization with provider ${deps.semanticNormalizer.descriptor.provider}.`,
          "completed",
        ),
      ],
    };
  };

  const normalizeRequest = (state: typeof WorkflowState.State) => {
    const normalizedRequest = normalizeWorkshopRequest(
      state.requestEvidence,
      state.requestInterpretation,
      state.semanticNormalization,
    );

    return {
      normalizedRequest,
      trace: [
        createTraceEvent(
          "normalize_request",
          `Normalized request ${normalizedRequest.requestId} into a review-friendly payload.`,
          "completed",
        ),
      ],
    };
  };

  const draftPublication = async (
    state: typeof WorkflowState.State,
    config?: RunnableConfig,
  ) => {
    const stepConfig = createStepRunnableConfig(config, "draft_publication", {
      provider: deps.drafter.descriptor.provider,
      model: deps.drafter.descriptor.model,
    });
    const draftOutput = await deps.drafter.draft(
      state.normalizedRequest,
      stepConfig,
    );

    return {
      draftOutput,
      trace: [
        createTraceEvent(
          "draft_publication",
          `Generated publication copy with provider ${deps.drafter.descriptor.provider}.`,
          "completed",
        ),
      ],
    };
  };

  const analyzePolicy = async (
    state: typeof WorkflowState.State,
    config?: RunnableConfig,
  ) => {
    const stepConfig = createStepRunnableConfig(config, "policy_analysis", {
      provider: deps.policyAnalyzer.descriptor.provider,
      model: deps.policyAnalyzer.descriptor.model,
    });
    const policyAnalysis = await deps.policyAnalyzer.analyze(
      state.normalizedRequest,
      state.draftOutput,
      stepConfig,
    );

    return {
      policyAnalysis,
      trace: [
        createTraceEvent(
          "policy_analysis",
          `Analyzed policy findings with provider ${deps.policyAnalyzer.descriptor.provider}.`,
          policyAnalysis.findings.some((finding) => finding.severity === "review_required")
            ? "flagged"
            : "completed",
        ),
      ],
    };
  };

  const policyReview = (state: typeof WorkflowState.State) => {
    const policyDecision = evaluatePolicy(
      state.normalizedRequest,
      state.draftOutput,
      state.policyAnalysis,
    );

    return {
      policyDecision,
      trace: [
        createTraceEvent(
          "policy_review",
          policyDecision.decisionRationale,
          policyDecision.status === "ready_to_publish" ? "completed" : "flagged",
        ),
      ],
    };
  };

  const readyToPublish = (state: typeof WorkflowState.State) => {
    const reviewOutcome = buildReviewOutcome(state.policyDecision);

    return {
      reviewOutcome,
      trace: [
        createTraceEvent(
          "ready_to_publish",
          reviewOutcome.summary,
          "completed",
        ),
      ],
    };
  };

  const manualReviewGate = (state: typeof WorkflowState.State) => {
    const reviewOutcome = buildReviewOutcome(state.policyDecision);

    return {
      reviewOutcome,
      trace: [
        createTraceEvent(
          "manual_review_gate",
          reviewOutcome.summary,
          "flagged",
        ),
      ],
    };
  };

  const finalizeOutputs = (state: typeof WorkflowState.State) => {
    const publicationPacket = buildPublicationPacket(
      state.normalizedRequest,
      state.draftOutput,
      state.reviewOutcome,
    );
    const organizerDigest = buildOrganizerDigest(
      state.normalizedRequest,
      state.policyDecision,
      state.reviewOutcome,
    );

    return {
      publicationPacket,
      organizerDigest,
      trace: [
        createTraceEvent(
          "finalize_outputs",
          `Built packet with status ${state.reviewOutcome.status}.`,
          "completed",
        ),
      ],
    };
  };

  return new StateGraph(WorkflowState)
    .addNode("interpret_request", interpretRequest)
    .addNode("semantic_normalization", semanticNormalize)
    .addNode("normalize_request", normalizeRequest)
    .addNode("draft_publication", draftPublication)
    .addNode("policy_analysis", analyzePolicy)
    .addNode("policy_review", policyReview)
    .addNode("ready_to_publish", readyToPublish)
    .addNode("manual_review_gate", manualReviewGate)
    .addNode("finalize_outputs", finalizeOutputs)
    .addEdge(START, "interpret_request")
    .addEdge("interpret_request", "semantic_normalization")
    .addEdge("semantic_normalization", "normalize_request")
    .addEdge("normalize_request", "draft_publication")
    .addEdge("draft_publication", "policy_analysis")
    .addEdge("policy_analysis", "policy_review")
    .addConditionalEdges("policy_review", (state) => {
      return state.policyDecision.status === "ready_to_publish"
        ? "ready_to_publish"
        : "manual_review_gate";
    })
    .addEdge("ready_to_publish", "finalize_outputs")
    .addEdge("manual_review_gate", "finalize_outputs")
    .addEdge("finalize_outputs", END)
    .compile();
}

function createTraceEvent(
  step: string,
  detail: string,
  status: "completed" | "flagged",
): TraceEvent {
  return {
    step,
    detail,
    status,
    at: new Date().toISOString(),
  };
}
