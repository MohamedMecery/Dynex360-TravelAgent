export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateAnswerInput {
  systemPrompt: string;
  question: string;
  context: string;
  history?: ClaudeMessage[];
}

export interface GenerateAnswerResult {
  answer: string;
  model: string;
  usedLlm: boolean;
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export async function generateKnowledgeAnswer(
  input: GenerateAnswerInput
): Promise<GenerateAnswerResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    return {
      answer: buildExtractiveAnswer(input.question, input.context),
      model: "extractive-fallback",
      usedLlm: false,
    };
  }

  const messages: ClaudeMessage[] = [
    ...(input.history ?? []),
    {
      role: "user",
      content: `Context from company knowledge base:\n\n${input.context}\n\nQuestion: ${input.question}`,
    },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: input.systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    console.error("Claude API error:", response.status, await response.text());
    return {
      answer: buildExtractiveAnswer(input.question, input.context),
      model: "extractive-fallback",
      usedLlm: false,
    };
  }

  const payload = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const text = payload.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  return {
    answer: text || buildExtractiveAnswer(input.question, input.context),
    model: DEFAULT_MODEL,
    usedLlm: true,
  };
}

function buildExtractiveAnswer(question: string, context: string): string {
  if (!context.trim()) {
    return (
      "I don't have documented guidance for that question in your agency knowledge base. " +
      "Ask a tenant admin to upload policies, FAQs, or SOPs under Settings → Knowledge."
    );
  }

  return (
    `Based on your agency documentation:\n\n${context.trim()}\n\n` +
    `This answer was generated from retrieved excerpts without an LLM. ` +
    `Set ANTHROPIC_API_KEY for richer synthesis.`
  );
}
