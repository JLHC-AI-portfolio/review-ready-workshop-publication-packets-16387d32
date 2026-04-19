import { describe, expect, it } from "vitest";

import { buildDeterministicWorkshopInterpretation } from "../src/interpretation/deterministicInterpretationService.js";
import { normalizeWorkshopRequest } from "../src/normalization.js";
import { evaluatePolicy } from "../src/policy.js";

describe("policy gate", () => {
  it("approves a request with complete publication details", () => {
    const normalized = normalizeWorkshopRequest({
      requestId: "wrk_clear",
      submittedAt: "2026-04-05T09:00:00Z",
      organizerName: "Tara Brooks",
      organizerEmail: "tara.brooks@example.org",
      workshopTitle: "Family Bookbinding Basics",
      shortDescription: "A complete, accessible family workshop.",
      fullDescription: "Families learn simple binding steps together.",
      preferredDate: "2026-05-08 16:00",
      fallbackDate: "",
      durationMinutes: 75,
      venueName: "Riverside Branch Library",
      venueType: "indoor",
      neighborhood: "Riverside",
      targetAudience: "Families with school-age children",
      capacity: 16,
      accessibilityNotes: "Library entrance and activity room are wheelchair accessible.",
      ageGuidance: "Children 8+ with an adult helper.",
      materialNeeds: ["paper", "thread"],
      facilitatorBio: "Tara leads the branch maker table.",
      publicationGoal: "Publish a library website card.",
      weatherPlan: "",
      internalNotes: "",
      policyAcknowledgement: true,
    });

    const decision = evaluatePolicy(normalized, {
      bulletinBlurb: "Family Bookbinding Basics is a complete and accessible workshop.",
      newsletterSnippet: "Family Bookbinding Basics at Riverside Branch Library.",
      publicSummary: "Families learn simple binding together.",
      reviewNotes: [],
      policyConcerns: [],
      confidenceNote: "All required details are present.",
    });

    expect(decision.status).toBe("ready_to_publish");
    expect(decision.reviewFlags).toHaveLength(0);
  });

  it("holds when accessibility and age guidance are unresolved", () => {
    const normalized = normalizeWorkshopRequest({
      requestId: "wrk_hold",
      submittedAt: "2026-04-05T09:00:00Z",
      organizerName: "Maya Delgado",
      organizerEmail: "maya.delgado@example.org",
      workshopTitle: "Neighborhood Zine Studio",
      shortDescription: "A hands-on evening for mini zines.",
      fullDescription: "Participants make mini zines together.",
      preferredDate: "2026-05-14 18:30",
      fallbackDate: "",
      durationMinutes: 90,
      venueName: "Maple Corner Library Terrace Room",
      venueType: "indoor",
      neighborhood: "Maple Grove",
      targetAudience: "Older teens and adults",
      capacity: 18,
      accessibilityNotes: "Need to confirm whether the side entrance elevator will be available.",
      ageGuidance: "",
      materialNeeds: ["paper"],
      facilitatorBio: "Maya runs the bulletin table.",
      publicationGoal: "Create a website listing.",
      weatherPlan: "",
      internalNotes: "",
      policyAcknowledgement: true,
    });

    const decision = evaluatePolicy(normalized, {
      bulletinBlurb: "Neighborhood Zine Studio is a creative meetup.",
      newsletterSnippet: "Neighborhood Zine Studio in Maple Grove.",
      publicSummary: "Neighbors create zines together.",
      reviewNotes: ["Accessibility still needs confirmation."],
      policyConcerns: [],
      confidenceNote: "Coordinator review is still recommended.",
    });

    expect(decision.status).toBe("hold_for_manual_review");
    expect(decision.reviewFlags.join(" ")).toContain("Accessibility");
    expect(decision.reviewFlags.join(" ")).toContain("Age guidance");
  });

  it("deduplicates AI concerns that restate canonical review flags", () => {
    const normalized = normalizeWorkshopRequest({
      requestId: "wrk_dedupe",
      submittedAt: "2026-04-06T11:30:00Z",
      organizerName: "Lena Shah",
      organizerEmail: "lena.shah@example.org",
      workshopTitle: "Neighborhood Sketchbook Swap",
      shortDescription: "A beginner-friendly drawing exchange.",
      fullDescription: "Participants sketch together and swap quick prompts.",
      preferredDate: "2026-05-10 13:00",
      fallbackDate: "",
      durationMinutes: 60,
      venueName: "Greenway Hall",
      venueType: "indoor",
      neighborhood: "Greenway",
      targetAudience: "Beginners who want a relaxed creative meetup",
      capacity: 14,
      accessibilityNotes: "TBD after venue walk-through.",
      ageGuidance: "",
      materialNeeds: ["clipboards", "pencils"],
      facilitatorBio: "Lena coordinates the monthly sketch walk.",
      publicationGoal: "Prepare a website listing and organizer digest.",
      weatherPlan: "",
      internalNotes: "",
      policyAcknowledgement: true,
    });

    const decision = evaluatePolicy(normalized, {
      bulletinBlurb: "Neighborhood Sketchbook Swap is a relaxed drawing meetup.",
      newsletterSnippet: "Neighborhood Sketchbook Swap at Greenway Hall.",
      publicSummary: "Beginners gather for a short sketch exchange.",
      reviewNotes: [],
      policyConcerns: [
        "Accessibility confirmation is pending and should be resolved to ensure inclusivity.",
        "Age guidance is not provided, which may affect participant expectations.",
        "Coordinator should shorten the title slightly for the newsletter digest.",
      ],
      confidenceNote: "Manual review is still advised.",
    });

    expect(decision.reviewFlags).toEqual([
      "Accessibility details still need confirmation.",
      "Age guidance is missing.",
      "Coordinator should shorten the title slightly for the newsletter digest.",
    ]);
  });

  it("holds when request interpretation surfaces a non-canonical blocker", () => {
    const request = {
      requestId: "wrk_interpreted_blocker",
      submittedAt: "2026-04-06T11:30:00Z",
      organizerName: "Nora Patel",
      organizerEmail: "nora.patel@example.org",
      workshopTitle: "Community Seed Library",
      shortDescription: "A practical seed sharing session.",
      fullDescription: "Participants learn how to label and exchange seeds.",
      preferredDate: "2026-05-10 13:00",
      fallbackDate: "",
      durationMinutes: 60,
      venueName: "Greenway Hall",
      venueType: "indoor" as const,
      neighborhood: "Greenway",
      targetAudience: "Adults interested in gardening",
      capacity: 14,
      accessibilityNotes: "Main entrance and activity room are step-free.",
      ageGuidance: "Adults only.",
      materialNeeds: ["labels", "markers"],
      facilitatorBio: "Nora coordinates the local seed library.",
      publicationGoal: "Prepare a website listing and organizer digest.",
      weatherPlan: "",
      internalNotes: "",
      policyAcknowledgement: true,
    };
    const interpretation = buildDeterministicWorkshopInterpretation(request);
    const normalized = normalizeWorkshopRequest(request, {
      ...interpretation,
      riskSignals: [
        ...interpretation.riskSignals,
        {
          concern: "Registration handling is unclear for a capacity-limited room.",
          evidence: "Capacity is 14 and registration handling is not described.",
          severity: "review_required",
        },
      ],
    });

    const decision = evaluatePolicy(normalized, {
      bulletinBlurb: "Community Seed Library is a practical seed sharing session.",
      newsletterSnippet: "Community Seed Library at Greenway Hall.",
      publicSummary: "Participants learn how to label and exchange seeds.",
      reviewNotes: [],
      policyConcerns: [],
      confidenceNote: "The request is otherwise complete.",
    });

    expect(decision.status).toBe("hold_for_manual_review");
    expect(decision.reviewFlags).toEqual([
      "Registration handling is unclear for a capacity-limited room.",
    ]);
    expect(decision.reviewerChecklist).toEqual([
      "Review interpreted evidence: Capacity is 14 and registration handling is not described.",
    ]);
  });
});
