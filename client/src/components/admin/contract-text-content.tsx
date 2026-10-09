import { contractTextLayout } from "@/lib/contract-text-layout";
import { Textarea } from "@/components/ui/textarea";

// Match the native read-only text surface used by Contract text preview.
export default function ContractTextContent({ text, documentLanguage, siteLanguage, emptyText, testId, className = "" }: {
  text: string | null;
  documentLanguage?: string | null;
  siteLanguage: string;
  emptyText?: string;
  testId: string;
  className?: string;
}) {
  const hasText = Boolean(text?.trim());
  return (
    <Textarea
      data-testid={testId}
      {...contractTextLayout(hasText ? documentLanguage : siteLanguage, hasText ? text : null, siteLanguage)}
      lang={hasText ? documentLanguage || siteLanguage : siteLanguage}
      readOnly
      rows={16}
      value={hasText ? text! : emptyText || ""}
      aria-label={hasText ? undefined : emptyText}
      className={`min-h-0 min-w-0 w-full resize-none overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-7 whitespace-pre-wrap break-words ${!hasText ? "text-muted-foreground" : ""} ${className}`}
    />
  );
}
