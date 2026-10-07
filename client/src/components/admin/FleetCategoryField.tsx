import { fleetCategoryLabel, type FleetCategory } from "@shared/fleet-category";

export default function FleetCategoryField({ language, value, onChange }: {
  language: string; value: FleetCategory; onChange: (value: FleetCategory) => void;
}) {
  return <label className="space-y-2 col-span-2">
    <span className="text-sm font-medium">
      {language === "fa" ? "گروه ناوگان" : language === "ar" ? "مجموعة الأسطول" : language === "tr" ? "Filo grubu" : "Fleet group"}
    </span>
    <select name="fleetCategory" defaultValue={value} required
      onChange={event => onChange(event.target.value as FleetCategory)}
      className="block w-full rounded-md border border-input bg-background p-2 text-sm">
      {(["standard", "contract"] as const).map(category =>
        <option key={category} value={category}>{fleetCategoryLabel(category, language)}</option>)}
    </select>
  </label>;
}
