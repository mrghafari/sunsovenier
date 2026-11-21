import { createHash } from "node:crypto";
import { mapShopTranslation, type ShopTranslationLanguage, type ShopTranslationResult, type ShopTranslationSource } from "@shared/shop-translation";

type CloudTranslate = (batch: string[], target: ShopTranslationLanguage, apiKey: string, signal: AbortSignal) => Promise<string[]>;

const translateBatch: CloudTranslate = async (batch, target, apiKey, signal) => {
  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ q: batch, target, format: "text" }),
    redirect: "error",
    signal,
  });
  if (!response.ok) throw new Error(`Google Translation status ${response.status}`);
  const payload = await response.json() as { data?: { translations?: { translatedText?: string }[] } };
  const output = payload.data?.translations?.map(item => item.translatedText);
  if (!output || output.length !== batch.length || !output.every((text): text is string => typeof text === "string" && !!text.trim())) {
    throw new Error("Incomplete Google Translation response");
  }
  return output;
};

export function createShopTranslationService(provider: CloudTranslate = translateBatch) {
  const results = new Map<string, { expires: number; result: ShopTranslationResult }>();
  const pending = new Map<string, Promise<ShopTranslationResult>>();
  const limitWindowMs = 60 * 60 * 1000;
  let budget = { startsAt: Date.now(), characters: 0, requests: 0 };
  return async (source: ShopTranslationSource, target: ShopTranslationLanguage, apiKey: string | undefined): Promise<ShopTranslationResult> => {
    if (!apiKey) return { status: "unavailable" };
    const original = JSON.stringify(source);
    const key = createHash("sha256").update(target).update(original).digest("hex");
    const now = Date.now();
    const cached = results.get(key);
    if (cached && cached.expires > now) return cached.result;
    const current = pending.get(key);
    if (current) return current;

    const items = new Set<string>();
    mapShopTranslation(source, text => {
      if (/\p{L}/u.test(text)) items.add(text);
      return text;
    });
    const count = Array.from(items).reduce((size, item) => size + item.length, 0);
    if (count > 12000 || Array.from(items).some(item => item.length > 4500)) return { status: "unavailable" };
    if (now - budget.startsAt >= limitWindowMs) budget = { startsAt: now, characters: 0, requests: 0 };
    if (pending.size >= 4 || budget.requests >= 60 || budget.characters + count > 100_000) return { status: "unavailable" };
    budget.requests++;
    budget.characters += count;

    const job = (async (): Promise<ShopTranslationResult> => {
      const signal = AbortSignal.timeout(9000);
      const values = new Map<string, string>();
      let batch: string[] = [];
      let size = 0;
      const flush = async () => {
        if (!batch.length) return;
        const translations = await provider(batch, target, apiKey, signal);
        if (translations.length !== batch.length || !translations.every(text => typeof text === "string" && !!text.trim())) throw new Error("Incomplete translation");
        batch.forEach((text, index) => values.set(text, translations[index]));
        batch = [];
        size = 0;
      };
      for (const text of items) {
        if (batch.length >= 100 || size + text.length > 4500) await flush();
        batch.push(text);
        size += text.length;
      }
      await flush();
      return { status: "translated", source: original, text: mapShopTranslation(source, text => values.get(text) ?? text) };
    })().catch((error: unknown): ShopTranslationResult => {
      // Do not log the request, content, or API key.
      console.warn("[Shop translation] Provider did not return a complete translation:", error instanceof Error ? error.name : "unknown");
      return { status: "unavailable" };
    }).then(result => {
      if (results.size >= 256) results.delete(results.keys().next().value!);
      results.set(key, { expires: Date.now() + (result.status === "translated" ? 86_400_000 : 120_000), result });
      return result;
    }).finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  };
}

export const translateShopProduct = createShopTranslationService();
