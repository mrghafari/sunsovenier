import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = workerUrl;

const copy = {
  en: { loading: "Loading receipt…", error: "The receipt could not be displayed. Check your session and try again.", previous: "Previous page", next: "Next page", retry: "Retry", open: "Open original file", page: "Page" },
  fa: { loading: "در حال نمایش رسید…", error: "نمایش رسید انجام نشد. ورود به حساب را بررسی کنید و دوباره تلاش کنید.", previous: "صفحهٔ قبل", next: "صفحهٔ بعد", retry: "تلاش دوباره", open: "باز کردن فایل اصلی", page: "صفحه" },
  ar: { loading: "جارٍ عرض الإيصال…", error: "تعذر عرض الإيصال. تحقق من تسجيل الدخول وحاول مجدداً.", previous: "الصفحة السابقة", next: "الصفحة التالية", retry: "إعادة المحاولة", open: "فتح الملف الأصلي", page: "صفحة" },
  tr: { loading: "Makbuz yükleniyor…", error: "Makbuz görüntülenemedi. Oturumunuzu kontrol edip tekrar deneyin.", previous: "Önceki sayfa", next: "Sonraki sayfa", retry: "Tekrar dene", open: "Orijinal dosyayı aç", page: "Sayfa" },
};

/** Render private PDFs without Chrome's embedded PDF plugin or an iframe. */
export function PrivateReceiptPdf({
  src, language = "en", zoom = 1, rotation = 0, title,
}: {
  src: string; language?: string; zoom?: number; rotation?: number; title: string;
}) {
  const text = copy[language as keyof typeof copy] || copy.en;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const localFile = (() => {
    try {
      const url = new URL(src, window.location.origin);
      return url.origin === window.location.origin && ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  })();

  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    let task: ReturnType<typeof getDocument> | undefined;
    setDocument(null);
    setPage(1);
    setError(false);
    setLoading(true);
    void (async () => {
      try {
        if (!localFile) throw new Error("Receipt must use the authenticated app origin");
        const response = await fetch(localFile, {
          credentials: "include", cache: "no-store", redirect: "error", signal: abort.signal,
        });
        if (!response.ok) throw new Error("Receipt unavailable");
        const data = new Uint8Array(await response.arrayBuffer());
        if (disposed) return;
        task = getDocument({ data, isEvalSupported: false });
        const pdf = await task.promise;
        if (!disposed) setDocument(pdf);
      } catch {
        if (!disposed) { setError(true); setLoading(false); }
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      if (task) void task.destroy().catch(() => {});
    };
  }, [localFile, attempt]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    let disposed = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const pdfPage = await document.getPage(page);
        if (disposed || !canvasRef.current) return;
        const viewport = pdfPage.getViewport({ scale: zoom * 1.25, rotation: pdfPage.rotate + rotation });
        const canvas = canvasRef.current;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        render = pdfPage.render({
          canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await render.promise;
        if (!disposed) setLoading(false);
      } catch {
        if (!disposed) { setError(true); setLoading(false); }
      }
    })();
    return () => { disposed = true; render?.cancel(); };
  }, [document, page, zoom, rotation]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-center gap-3 border-b bg-white p-2">
        {document && (
          <>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{text.previous}</Button>
            <span aria-live="polite">{text.page} {page} / {document.numPages}</span>
            <Button variant="outline" size="sm" disabled={page >= document.numPages} onClick={() => setPage(p => p + 1)}>{text.next}</Button>
          </>
        )}
        {localFile && <a href={localFile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">{text.open}</a>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4" aria-busy={loading}>
        {loading && <p role="status" className="text-center">{text.loading}</p>}
        {error && (
          <div role="alert" className="space-y-3 text-center">
            <p>{text.error}</p>
            <Button variant="outline" onClick={() => setAttempt(n => n + 1)}>{text.retry}</Button>
          </div>
        )}
        <canvas ref={canvasRef} role="img" aria-label={`${title} — ${text.page} ${page}`}
          className="mx-auto bg-white shadow" style={{ display: loading || error ? "none" : "block" }} />
      </div>
    </div>
  );
}
