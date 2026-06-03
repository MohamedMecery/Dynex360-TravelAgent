/** Live LLM/API chat tests — optional in CI (extractive fallback can be slow/flaky). */
export const runAiApiTests =
  !process.env.CI || process.env.E2E_RUN_AI_API === "1";
