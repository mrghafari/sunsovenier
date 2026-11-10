import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { defaultHeroArtworkFor, type HeroArtworkLayer, type HeroArtworkSettings } from "./hero-artwork";

type Props = {
  sourceUrl: string;
  settings?: HeroArtworkSettings;
  locked: boolean;
  onChange: (settings: HeroArtworkSettings) => void;
};

export default function BannerArtworkEditor({ sourceUrl, settings, locked, onChange }: Props) {
  const sourceArtwork = defaultHeroArtworkFor(sourceUrl);
  const layers = useMemo(() => settings?.layers ?? sourceArtwork?.layers ?? [], [settings?.layers, sourceArtwork]);
  const enabled = settings?.enabled ?? Boolean(sourceArtwork);
  const updateLayer = (id: string, patch: Partial<HeroArtworkLayer>) => onChange({
    enabled: true,
    layers: layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer),
  });
  return (
    <fieldset className="space-y-3 rounded-lg border border-sky-200/20 bg-sky-950/20 p-3" data-testid="banner-artwork-editor">
      <legend className="px-1 text-sm font-semibold">متن استخراج‌شده از تصویر / Selectable banner text</legend>
      <p className="text-xs text-muted-foreground">
        {sourceArtwork
          ? "این گرافیک با نشانی منبع شناسایی شده است؛ لایه‌ها روی همان صفحه مختصات تصویر اصلی قرار می‌گیرند. / Recognized source artwork; layers use the original image coordinate plane."
          : "برای بارگذاری‌های جدید، متن به‌صورت پیش‌فرض غیرفعال است. / Text artwork is off by default for new uploads."}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={locked} checked={enabled} onChange={(event) => onChange({ enabled: event.target.checked, layers: settings?.layers ?? sourceArtwork?.layers ?? [] })} />
        فعال‌سازی متن قابل انتخاب / Enable selectable text
      </label>
      {enabled && <div className="space-y-3">
        {!layers.length && <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">یک لایه اضافه کنید تا متن روی این بنر نمایش داده شود. / Add a layer to place text on this banner.</p>}
        {layers.map((layer, index) => <article key={layer.id} className="space-y-2 rounded-md border bg-background/50 p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-xs">لایه {index + 1} / Layer {index + 1}</strong><Button type="button" size="sm" variant="ghost" aria-label={`Delete artwork layer ${index + 1}`} disabled={locked} onClick={() => onChange({ enabled: true, layers: layers.filter((item) => item.id !== layer.id) })}><Trash2 className="h-4 w-4"/></Button></div>
          <label className="block space-y-1 text-xs"><span>متن / Text</span><Textarea disabled={locked} dir="ltr" value={layer.text} rows={2} onChange={(event) => updateLayer(layer.id, { text: event.target.value })}/></label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["x", "X position"], ["y", "Y position"], ["width", "Width"], ["fontSize", "Font size"],
            ] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs"><span>{label}</span><Input type="number" min={0} max={2048} step={1} disabled={locked} value={layer[key]} onChange={(event) => updateLayer(layer.id, { [key]: Number(event.target.value) })}/></label>)}
          </div>
        </article>)}
        <Button type="button" size="sm" variant="outline" disabled={locked || layers.length >= 80} onClick={() => {
          const layer: HeroArtworkLayer = { id: `art-${Date.now().toString(36)}`, text: "New banner text", x: 80, y: 80, width: 320, fontSize: 20, fontWeight: 700, lineHeight: 24 };
          onChange({ enabled: true, layers: [...layers, layer] });
        }}><Plus className="mr-1 h-4 w-4"/>افزودن لایه / Add layer</Button>
      </div>}
    </fieldset>
  );
}
