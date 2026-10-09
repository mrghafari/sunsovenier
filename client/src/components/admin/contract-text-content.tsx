import { contractTextLayout } from "@/lib/contract-text-layout";

// Use the same document surface inside the text dialog and expanded rows.
export default function ContractTextContent({ text, documentLanguage, siteLanguage, emptyText, testId, className = "" }: {
  text: string | null;
  documentLanguage?: string | null;
  siteLanguage: string;
  emptyText?: string;
  testId: string;
  className?: string;
}) {
  return (
    <div data-testid={testId} {...contractTextLayout(documentLanguage, text, siteLanguage)}
      className={`min-h-0 min-w-0 w-full overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-7 whitespace-pre-wrap break-words ${className}`}>
      {text?.trim() ? text : emptyText ? (
        <p {...contractTextLayout(siteLanguage, null, siteLanguage)} className="text-muted-foreground">{emptyText}</p>
      ) : null}
    </div>
  );
}
