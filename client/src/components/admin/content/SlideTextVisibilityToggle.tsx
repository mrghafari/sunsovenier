import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingLanguage } from "@shared/landing-content";

const labels = {
  fa: { label: "متن روی اسلاید", visible: "نمایان", hidden: "پنهان", show: "نمایش متن روی اسلاید", hide: "پنهان کردن متن روی اسلاید" },
  en: { label: "Slide text", visible: "Visible", hidden: "Hidden", show: "Show slide text", hide: "Hide slide text" },
  ar: { label: "نص الشريحة", visible: "ظاهر", hidden: "مخفي", show: "إظهار نص الشريحة", hide: "إخفاء نص الشريحة" },
  tr: { label: "Slayt metni", visible: "Görünür", hidden: "Gizli", show: "Slayt metnini göster", hide: "Slayt metnini gizle" },
} as const;

export default function SlideTextVisibilityToggle({ language, visible, disabled, onChange, testId }: {
  language: LandingLanguage;
  visible: boolean;
  disabled?: boolean;
  onChange: (visible: boolean) => void;
  testId: string;
}) {
  const copy = labels[language];
  const Icon = visible ? Eye : EyeOff;
  return <Button type="button" size="sm" variant="outline"
    role="switch" aria-checked={visible} aria-label={copy.label}
    title={visible ? copy.hide : copy.show} disabled={disabled}
    data-testid={testId} onClick={() => onChange(!visible)}>
    <Icon className="me-1.5 h-4 w-4" aria-hidden="true" />
    {copy.label}: {visible ? copy.visible : copy.hidden}
  </Button>;
}
