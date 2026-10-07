// Business references are seven-digit issued codes, never database row IDs.
export function customerReferenceCode(code: unknown): string | null {
  return typeof code === "string" && /^9[0-9]{6}$/.test(code) ? code : null;
}
