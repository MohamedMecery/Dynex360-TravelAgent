const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

export interface TextChunk {
  index: number;
  content: string;
  tokenCount: number;
}

export function chunkText(text: string): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    const content = normalized.slice(start, end).trim();
    if (content) {
      chunks.push({
        index,
        content,
        tokenCount: Math.ceil(content.length / 4),
      });
      index += 1;
    }
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

export async function readUploadAsText(file: File): Promise<string> {
  const allowed = ["text/plain", "text/markdown", "application/json", ""];
  const name = file.name.toLowerCase();
  const isText =
    allowed.includes(file.type) ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".json");

  if (!isText) {
    throw new Error("Only .txt, .md, and .json files are supported in MVP");
  }

  return file.text();
}
