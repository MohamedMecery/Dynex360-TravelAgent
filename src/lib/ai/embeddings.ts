const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return null;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    console.error("Embedding API error:", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    data?: { embedding: number[] }[];
  };

  return payload.data?.[0]?.embedding ?? null;
}
