export function getNestedMessage(
  messages: Record<string, unknown>,
  key: string
): string | undefined {
  const keys = key.split(".");
  let current: unknown = messages;
  for (const part of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translateMessage(
  messages: Record<string, unknown>,
  fallbackMessages: Record<string, unknown>,
  key: string
): string {
  return (
    getNestedMessage(messages, key) ??
    getNestedMessage(fallbackMessages, key) ??
    key
  );
}
