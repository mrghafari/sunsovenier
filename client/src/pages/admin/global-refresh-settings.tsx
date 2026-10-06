import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Clock, Play, Pause, Settings, Zap, DollarSign, Package, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  GLOBAL_REFRESH_LOCALES,
  globalRefreshCatalog,
  type GlobalRefreshCopy,
  type RefreshDepartmentKey,
} from "@/lib/global-refresh-settings-catalog";

type DepartmentSettings = { autoRefresh: boolean; interval: number };
type SettingsState = {
  syncEnabled: boolean;
  globalInterval: number;
  departments: Record<RefreshDepartmentKey, DepartmentSettings>;
};

const DEFAULT_SETTINGS: SettingsState = {
  syncEnabled: true,
  globalInterval: 300,
  departments: {
    financial: { autoRefresh: true, interval: 300 },
    warehouse: { autoRefresh: true, interval: 300 },
    logistics: { autoRefresh: true, interval: 300 },
    email: { autoRefresh: true, interval: 30 },
    inventory: { autoRefresh: true, interval: 180 },
    crm: { autoRefresh: true, interval: 300 },
    orders: { autoRefresh: true, interval: 30 },
    inquiries: { autoRefresh: true, interval: 240 },
  },
};

const REFRESH_INTERVALS = [60, 120, 300, 600, 1800, 3600];
const DEPARTMENTS: Array<{ key: RefreshDepartmentKey; icon: LucideIcon; color: string; bgColor: string; storageName: string }> = [
  { key: "financial", icon: DollarSign, color: "text-green-600", bgColor: "bg-green-50", storageName: "واحد مالی" },
  { key: "warehouse", icon: Package, color: "text-blue-600", bgColor: "bg-blue-50", storageName: "واحد انبار" },
  { key: "logistics", icon: Truck, color: "text-purple-600", bgColor: "bg-purple-50", storageName: "واحد لجستیک" },
  { key: "email", icon: RefreshCw, color: "text-orange-600", bgColor: "bg-orange-50", storageName: "سیستم ایمیل" },
  { key: "inventory", icon: Package, color: "text-cyan-600", bgColor: "bg-cyan-50", storageName: "مدیریت موجودی" },
  { key: "crm", icon: RefreshCw, color: "text-pink-600", bgColor: "bg-pink-50", storageName: "مدیریت مشتریان" },
  { key: "orders", icon: RefreshCw, color: "text-indigo-600", bgColor: "bg-indigo-50", storageName: "مدیریت سفارشات" },
  { key: "inquiries", icon: RefreshCw, color: "text-teal-600", bgColor: "bg-teal-50", storageName: "پیگیری استعلامات" },
];

const cloneDefaults = (): SettingsState => ({
  ...DEFAULT_SETTINGS,
  departments: Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS.departments).map(([key, value]) => [key, { ...value }]),
  ) as SettingsState["departments"],
});

function asPositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readSettings(): SettingsState {
  const defaults = cloneDefaults();
  try {
    const raw = localStorage.getItem("global-refresh-settings");
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SettingsState> & { departments?: Record<string, Partial<DepartmentSettings>> };
    if (!parsed || typeof parsed !== "object") return defaults;
    const legacyFinance = parsed.departments?.finance;
    const storedDepartments = (parsed.departments ?? {}) as Record<string, Partial<DepartmentSettings>>;
    const departments = { ...defaults.departments };
    (Object.keys(departments) as RefreshDepartmentKey[]).forEach((key) => {
      const stored = storedDepartments[key] ?? (key === "financial" ? legacyFinance : undefined);
      if (stored && typeof stored === "object") {
        departments[key] = {
          autoRefresh: typeof stored.autoRefresh === "boolean" ? stored.autoRefresh : departments[key].autoRefresh,
          interval: asPositiveNumber(stored.interval, departments[key].interval),
        };
      }
    });
    return {
      syncEnabled: typeof parsed.syncEnabled === "boolean" ? parsed.syncEnabled : defaults.syncEnabled,
      globalInterval: asPositiveNumber(parsed.globalInterval, defaults.globalInterval),
      departments,
    };
  } catch {
    return defaults;
  }
}

function formatInterval(seconds: number, copy: GlobalRefreshCopy, locale: string) {
  const amount = seconds % 3600 === 0 ? seconds / 3600 : seconds / 60;
  const unit = seconds % 3600 === 0
    ? copy.units.hour
    : amount === 1 ? copy.units.minute : copy.units.minutes;
  return `${new Intl.NumberFormat(locale).format(amount)} ${unit}`;
}

export default function GlobalRefreshSettings() {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const copy = globalRefreshCatalog[language];
  const locale = GLOBAL_REFRESH_LOCALES[language];
  const [globalSettings, setGlobalSettings] = useState<SettingsState>(cloneDefaults);
  const [loaded, setLoaded] = useState(false);
  const intervalLabels = useMemo(
    () => REFRESH_INTERVALS.map((value) => ({ value, label: formatInterval(value, copy, locale) })),
    [copy, locale],
  );

  useEffect(() => {
    setGlobalSettings(readSettings());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("global-refresh-settings", JSON.stringify(globalSettings));
      DEPARTMENTS.forEach((dept) => {
        const settings = globalSettings.departments[dept.key];
        if (!settings) return;
        localStorage.setItem(`refresh-settings-${dept.storageName}`, JSON.stringify({
          autoRefresh: settings.autoRefresh,
          refreshInterval: globalSettings.syncEnabled ? globalSettings.globalInterval : settings.interval,
        }));
      });
    } catch {
      // Local persistence is best-effort and remains intentionally client-only.
    }
  }, [globalSettings, loaded]);

  const updateAllIntervals = (previous: SettingsState, interval: number): SettingsState => ({
    ...previous,
    globalInterval: interval,
    departments: previous.syncEnabled
      ? Object.fromEntries(Object.entries(previous.departments).map(([key, value]) => [key, { ...value, interval }])) as SettingsState["departments"]
      : previous.departments,
  });

  const handleGlobalIntervalChange = (value: string) => {
    const interval = Number(value);
    setGlobalSettings((previous) => updateAllIntervals(previous, interval));
    toast({ title: copy.saved, description: `${copy.newInterval}: ${formatInterval(interval, copy, locale)}` });
  };

  const handleSyncToggle = (enabled: boolean) => {
    setGlobalSettings((previous) => ({
      ...previous,
      syncEnabled: enabled,
      departments: enabled
        ? Object.fromEntries(Object.entries(previous.departments).map(([key, value]) => [key, { ...value, interval: previous.globalInterval }])) as SettingsState["departments"]
        : previous.departments,
    }));
    toast({
      title: enabled ? copy.syncEnabled : copy.syncDisabled,
      description: enabled ? copy.departmentsShared : copy.departmentsSeparate,
    });
  };

  const handleDepartmentAutoRefreshToggle = (key: RefreshDepartmentKey, enabled: boolean) => {
    setGlobalSettings((previous) => ({
      ...previous,
      departments: { ...previous.departments, [key]: { ...previous.departments[key], autoRefresh: enabled } },
    }));
    toast({
      title: copy.departmentNames[key].name,
      description: enabled ? copy.autoEnabled : copy.autoDisabled,
    });
  };

  const handleDepartmentIntervalChange = (key: RefreshDepartmentKey, value: string) => {
    const interval = Number(value);
    setGlobalSettings((previous) => ({
      ...previous,
      departments: { ...previous.departments, [key]: { ...previous.departments[key], interval } },
    }));
    toast({
      title: copy.departmentNames[key].name,
      description: `${copy.newInterval}: ${formatInterval(interval, copy, locale)}`,
    });
  };

  return (
    <div className="container mx-auto min-h-[100dvh] p-6" dir={direction} lang={language}>
      <div className="mb-8">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-gray-900">
          <Zap className="h-8 w-8 text-purple-600" />
          {copy.title}
        </h1>
        <p className="text-gray-600">{copy.help}</p>
      </div>

      <Card className="mb-8 border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6 text-purple-600" />
            {copy.globalCard}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border bg-white p-4">
            <div className="flex items-center gap-3">
              {globalSettings.syncEnabled ? <Play className="h-5 w-5 text-green-600" /> : <Pause className="h-5 w-5 text-gray-600" />}
              <div>
                <Label className="text-base font-medium">{copy.syncUnits}</Label>
                <p className="text-sm text-gray-600">{globalSettings.syncEnabled ? copy.syncOn : copy.syncOff}</p>
              </div>
            </div>
            <Switch checked={globalSettings.syncEnabled} onCheckedChange={handleSyncToggle} />
          </div>

          {globalSettings.syncEnabled && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Clock className="h-4 w-4" />
                {copy.globalInterval}
              </Label>
              <Select value={String(globalSettings.globalInterval)} onValueChange={handleGlobalIntervalChange}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {intervalLabels.map((interval) => <SelectItem key={interval.value} value={String(interval.value)}>{interval.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-center rounded-lg bg-gray-50 p-4">
            <Badge variant="secondary" className={`px-6 py-2 text-lg ${globalSettings.syncEnabled ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
              {globalSettings.syncEnabled
                ? `${copy.active} — ${formatInterval(globalSettings.globalInterval, copy, locale)}`
                : copy.separateSettings}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {DEPARTMENTS.map((dept) => {
          const settings = globalSettings.departments[dept.key] ?? { autoRefresh: false, interval: 300 };
          const Icon = dept.icon;
          const detail = copy.departmentNames[dept.key];
          const activeInterval = globalSettings.syncEnabled ? globalSettings.globalInterval : settings.interval;
          return (
            <Card key={dept.key} className={`border-gray-200 ${dept.bgColor}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className={`h-5 w-5 ${dept.color}`} />
                  <span>{detail.name}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">{detail.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{copy.autoRefresh}</Label>
                  <Switch checked={settings.autoRefresh} onCheckedChange={(enabled) => handleDepartmentAutoRefreshToggle(dept.key, enabled)} />
                </div>
                {!globalSettings.syncEnabled && settings.autoRefresh && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{copy.interval}</Label>
                    <Select value={String(settings.interval)} onValueChange={(value) => handleDepartmentIntervalChange(dept.key, value)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {intervalLabels.map((interval) => <SelectItem key={interval.value} value={String(interval.value)}>{interval.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="text-center">
                  <Badge variant="outline" className={settings.autoRefresh ? "border-green-300 bg-green-100 text-green-800" : "border-gray-300 bg-gray-100 text-gray-600"}>
                    {settings.autoRefresh ? `${copy.active} — ${formatInterval(activeInterval, copy, locale)}` : copy.inactive}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            {copy.helpTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>{copy.helpSyncOn}</p>
          <p>{copy.helpSyncOff}</p>
          <p>{copy.helpImmediate}</p>
        </CardContent>
      </Card>
    </div>
  );
}