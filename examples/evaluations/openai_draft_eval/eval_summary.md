# Drafting Eval Summary

Reader note: This is technical evidence for the AI-assisted drafting boundary. It shows whether drafted outputs preserved required facts and review flags on a small checked-in dataset; it is not a claim that every future workshop request will pass without human review.

- Provider: openai
- Model: gpt-4.1-mini
- Passed: 3/3
- Dataset: evals/draft_eval_cases.json

## Case Results

- PASS indoor_clear_path: expected ready_to_publish, got ready_to_publish
- PASS missing_accessibility_and_age: expected hold_for_manual_review, got hold_for_manual_review
- PASS outdoor_weather_gap: expected hold_for_manual_review, got hold_for_manual_review
