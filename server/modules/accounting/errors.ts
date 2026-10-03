export function databaseErrorCode(error: unknown): string | undefined {
  let current = error;
  const visited = new Set<unknown>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const node = current as {code?:unknown;cause?:unknown};
    if (typeof node.code==="string") return node.code;
    current = node.cause;
  }
  return undefined;
}