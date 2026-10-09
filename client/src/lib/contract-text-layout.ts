// Agreement text follows its own document language, not the surrounding UI.
// Older snapshots may lack a language tag and start with a Latin contract code.
export function contractTextLayout(documentLanguage: string | null | undefined, text: string | null, siteLanguage: string) {
  let direction: "rtl" | "ltr";
  if (documentLanguage === "fa" || documentLanguage === "ar") direction = "rtl";
  else if (documentLanguage === "en" || documentLanguage === "tr") direction = "ltr";
  else {
    const letters = text?.match(/\p{Letter}/gu) || [];
    const arabic = letters.filter(letter => /\p{Script=Arabic}/u.test(letter)).length;
    const latin = letters.filter(letter => /\p{Script=Latin}/u.test(letter)).length;
    direction = arabic === latin ? (siteLanguage === "fa" || siteLanguage === "ar" ? "rtl" : "ltr")
      : arabic > latin ? "rtl" : "ltr";
  }
  // Explicit alignment avoids the application's ancestor-based RTL utility
  // overrides flipping text-right/text-left on mixed-language screens.
  return { dir: direction, style: { direction, textAlign: direction === "rtl" ? "right" as const : "left" as const } };
}
