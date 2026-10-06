import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  Activity, AlertTriangle, ArrowLeft, Boxes, Check, CircleHelp,
  ClipboardList, Database, FileText, Gauge, LockKeyhole, MapPinned, Settings2, ShieldCheck,
  Truck, Warehouse,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LoadingSection } from "@shared/loading/contracts";
import { useLoadingModuleStatus } from "./use-loading-module-status";
import { useLoadingFoundation } from "./use-loading-foundation";
import { authorizedLoadingSections, hasLoadingSectionAccess, loadingRoleLabel } from "./sections";
import { loadingCopy, loadingSectionLabel } from "./copy";
import type { LoadingFoundation, LoadingModuleStatus } from "@shared/loading/contracts";

const sectionIcons = {
  overview: Activity,
  orders: ClipboardList,
  "main-gate": LockKeyhole,
  yard: MapPinned,
  "warehouse-gate": Warehouse,
  weighbridge: Gauge,
  loading: Truck,
  documents: FileText,
  reports: Activity,
  settings: Settings2,
  simulator: CircleHelp,
} satisfies Record<LoadingSection, typeof Activity>;

export default function LoadingManagement() {
  const { language, direction } = useLanguage();
  const copy = loadingCopy(language);
  const [location, setLocation] = useLocation();
  const statusQuery = useLoadingModuleStatus();
  const status = statusQuery.data;
  const foundationQuery = useLoadingFoundation(status);
  const section = useMemo(() => {
    const part = location.split("/").filter(Boolean)[2];
    return part && part in sectionIcons ? (part as LoadingSection) : "overview";
  }, [location]);

  const navigate = (next: LoadingSection) => {
    setLocation(next === "overview" ? "/management/loading" : `/management/loading/${next}`);
  };

  return (
    <div lang={language} dir={direction} className="loading-shell min-h-[100dvh] bg-[#eef1eb] text-[#233833]">
      <header className="loading-topbar border-b border-[#d4ddd5] bg-[#f8f9f5]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#244c47] text-[#e4ece5]"><Boxes className="h-5 w-5"/></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold tracking-[.17em] text-[#71817a]">{copy.brand}</p>
              <h1 className="truncate text-base font-bold text-[#243d38] sm:text-lg">{copy.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#d4c9a8] bg-[#f4efdf] px-3 py-1.5 text-[10px] font-bold tracking-[.1em] text-[#725e31] sm:inline-flex">{copy.phase}</span>
            <button type="button" onClick={() => setLocation("/site-management")} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#64756e] transition-colors hover:bg-[#e9eee8] hover:text-[#244c47]">
              <ArrowLeft className="h-4 w-4"/><span className="hidden sm:inline">{language === "fa" ? "بازگشت" : language === "ar" ? "عودة" : language === "tr" ? "Geri" : "Back"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7 lg:py-8">
        <aside className="min-w-0">
          <div className="rounded-2xl border border-[#d4ddd5] bg-[#f8f9f5] p-3 shadow-[0_8px_24px_rgba(38,62,54,.035)]">
            <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#839189]">{copy.subtitle}</p>
            {statusQuery.isLoading ? <NavSkeleton/> :
              statusQuery.isError ? <p className="px-3 py-4 text-xs leading-5 text-[#a25343]">{copy.error}</p> :
              status?.enabled === true && foundationQuery.data ? (
                <nav aria-label={copy.allowed} className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                  {authorizedLoadingSections(foundationQuery.data).map(item => {
                    const Icon = sectionIcons[item];
                    const active = item === section;
                    return <button key={item} type="button" onClick={() => navigate(item)} aria-current={active ? "page" : undefined}
                      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-all duration-200 lg:w-full ${active ? "bg-[#244c47] text-[#f4f5ed] shadow-sm" : "text-[#536760] hover:bg-[#e9eee8] hover:text-[#244c47]"}`}>
                      <Icon className="h-4 w-4 shrink-0"/><span>{loadingSectionLabel(language, item)}</span>
                      {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-[#d6bc70]"/>}
                    </button>;
                  })}
                </nav>
              ) : <div className="px-3 py-4 text-xs leading-5 text-[#728079]">{copy.disabledText}</div>}
            <div className="mt-4 hidden border-t border-[#e0e6df] px-3 pt-4 lg:block">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#87948c]">
                <span className={`h-2 w-2 rounded-full ${status?.enabled ? "bg-[#6c9a78]" : "bg-[#c27b5e]"}`}/>
                {status?.enabled ? copy.enabled : copy.disabled}
              </div>
              <p className="mt-2 font-mono text-[10px] text-[#8b9690]">/management/loading</p>
            </div>
          </div>
          <div className="mt-4 hidden rounded-2xl border border-[#d4ddd5] bg-[#e5ebe4] p-4 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#75857d]">{copy.boundary}</p>
            <p className="mt-2 text-xs leading-5 text-[#61736b]">{copy.noWorkflowText}</p>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#87948c]">{copy.phase}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-.03em] text-[#263f39] sm:text-3xl">{loadingSectionLabel(language, section)}</h2>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#d5ddd3] bg-[#f7f8f4] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[#697a71]">
              <ShieldCheck className="h-4 w-4 text-[#5c8571]"/>{copy.phase}
            </div>
          </div>

          {statusQuery.isLoading ? <LoadingPanel copy={copy.loading}/> :
            statusQuery.isError ? <ErrorPanel message={statusQuery.error instanceof Error ? statusQuery.error.message : copy.error} retry={() => statusQuery.refetch()} copy={copy}/> :
            status?.enabled !== true ? <DisabledPanel copy={copy}/> :
            foundationQuery.isLoading ? <LoadingPanel copy={copy.loading}/> :
            foundationQuery.isError ? <ErrorPanel message={foundationQuery.error instanceof Error ? foundationQuery.error.message : copy.error} retry={() => foundationQuery.refetch()} copy={copy}/> :
            foundationQuery.data ? <LoadingFoundationView
              status={status}
              foundation={foundationQuery.data}
              section={section}
              language={language}
            /> : <LoadingPanel copy={copy.loading}/>}
        </main>
      </div>
    </div>
  );
}

export function LoadingFoundationView({ status, foundation, section, language }: {
  status: LoadingModuleStatus;
  foundation: LoadingFoundation;
  section: LoadingSection;
  language: "fa" | "ar" | "en" | "tr";
}) {
  const copy = loadingCopy(language);
  if (status.enabled !== true) return <DisabledPanel copy={copy}/>;
  if (!hasLoadingSectionAccess(foundation, section)) return <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#e3c9b5] bg-[#f8eee5] px-4 py-4">
    <LockKeyhole className="h-5 w-5 text-[#a36547]"/><div><h3 className="font-bold text-[#744b38]">{copy.denied}</h3><p className="mt-1 text-sm leading-6 text-[#876b5a]">{copy.deniedText}</p></div>
  </div>;
  if (section !== "overview") return <div className="space-y-4">
    <UnavailableSection copy={copy}/>
    <FoundationFacts status={status} foundation={foundation} copy={copy} language={language}/>
  </div>;

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-2xl border border-[#31544d] bg-[#244c47] px-5 py-6 text-[#f0f2e9] shadow-[0_14px_36px_rgba(33,68,61,.12)] sm:px-7 sm:py-8">
      <div className="pointer-events-none absolute -end-10 -top-20 h-64 w-64 rounded-full border border-white/10"/>
      <div className="pointer-events-none absolute -end-2 -top-12 h-48 w-48 rounded-full border border-white/10"/>
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#d8dfd1]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d5bd73]"/> {copy.phase}
        </div>
        <h3 className="mt-5 text-2xl font-bold tracking-[-.035em] sm:text-4xl">{copy.progress}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d0ddd3]">{copy.intro}</p>
      </div>
      <div className="relative mt-7 grid gap-2 sm:grid-cols-3">
        <PhaseStep label={copy.phaseOne} detail={copy.phaseOneText} done/>
        <PhaseStep label={copy.phaseTwo} detail={copy.phaseTwoText} active/>
        <PhaseStep label={copy.phaseThree} detail={copy.phaseThreeText}/>
      </div>
    </section>

    {foundation.schemaReady !== true && <div role="status" className="flex gap-3 rounded-xl border border-[#e1cba9] bg-[#f7f0e3] px-4 py-3 text-[#775d35]">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-sm font-bold">{copy.schemaBlocked}</p><p className="mt-1 text-xs leading-5">{copy.schemaBlockedText}</p></div>
    </div>}

    <FoundationFacts status={status} foundation={foundation} copy={copy} language={language}/>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-2xl border border-[#d4ddd5] bg-[#f8f9f5] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e8eee6] text-[#456a5b]"><Activity className="h-4 w-4"/></span>
          <div><h3 className="font-bold text-[#304941]">{copy.boundary}</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-[#6c7b73]">{copy.boundaryText}</p></div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {[copy.noWorkflow, copy.inventory, copy.realInventory, copy.financialPosting].map((label, index) =>
            <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-[#e2e7df] bg-[#f2f5ef] px-3 py-2.5 text-xs text-[#65766d]">
              <span>{label}</span><span className={`font-bold ${index === 0 ? "text-[#a36648]" : "text-[#697970]"}`}>{index === 0 ? copy.notReady : index === 1 ? copy.inventoryText : copy.notReady}</span>
            </div>)}
        </div>
      </div>
      <div className="rounded-2xl border border-[#d4ddd5] bg-[#e8eee7] p-5">
        <div className="flex items-center gap-2 text-[#42675a]"><Database className="h-4 w-4"/><h3 className="text-sm font-bold">{copy.allowed}</h3></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {authorizedLoadingSections(foundation).map(item => <span key={item} className="rounded-lg border border-[#d1ddd2] bg-[#f4f7f1] px-2.5 py-1.5 text-xs text-[#536a5e]">{loadingSectionLabel(language, item)}</span>)}
          {!authorizedLoadingSections(foundation).length && <span className="text-xs text-[#78867e]">{copy.none}</span>}
        </div>
      </div>
    </section>
  </div>;
}

function FoundationFacts({ status, foundation, copy, language }: {
  status: LoadingModuleStatus; foundation: LoadingFoundation; copy: ReturnType<typeof loadingCopy>; language: "fa" | "ar" | "en" | "tr";
}) {
  const facts = [
    { label: copy.enabled, value: status.enabled ? copy.ready : copy.notReady, tone: status.enabled },
    { label: copy.schema, value: foundation.schemaReady ? copy.ready : copy.notReady, tone: foundation.schemaReady },
    { label: copy.actor, value: `${foundation.actor.namespace === "admin" ? copy.actorAdmin : copy.actorCustom} · ${foundation.actor.id}`, mono: true },
    { label: copy.inventory, value: copy.inventoryText },
  ];
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {facts.map(fact => <article key={fact.label} className="rounded-xl border border-[#d4ddd5] bg-[#f8f9f5] p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#849189]">{fact.label}</p>
      <p dir={fact.mono ? "ltr" : undefined} className={`mt-2 break-words text-sm font-semibold ${fact.tone === false ? "text-[#a65e46]" : fact.tone === true ? "text-[#557e68]" : "text-[#334d43]"} ${fact.mono ? "font-mono" : ""}`}>{fact.value}</p>
    </article>)}
    <article className="rounded-xl border border-[#d4ddd5] bg-[#f8f9f5] p-4 sm:col-span-2">
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#849189]">{copy.roles}</p>
      <div className="mt-2 flex flex-wrap gap-2">{foundation.roles.map(role => <span key={role} className="rounded-md bg-[#e8eee6] px-2 py-1 text-xs font-medium text-[#51695d]">{loadingRoleLabel(role, language)}</span>)}
        {!foundation.roles.length && <span className="text-xs text-[#839087]">{copy.none}</span>}</div>
    </article>
    <article className="rounded-xl border border-[#d4ddd5] bg-[#f8f9f5] p-4 sm:col-span-2">
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#849189]">{copy.missing}</p>
      {foundation.missingTables.length ? <div className="mt-2 flex flex-wrap gap-2">{foundation.missingTables.map(table => <code key={table} dir="ltr" className="rounded-md border border-[#e5cfad] bg-[#f7f0e4] px-2 py-1 text-xs text-[#80623d]">{table}</code>)}</div> : <p className="mt-2 text-xs text-[#617b69]">{copy.none}</p>}
    </article>
  </section>;
}

function PhaseStep({ label, detail, done = false, active = false }: { label: string; detail: string; done?: boolean; active?: boolean }) {
  return <div className={`flex min-w-0 gap-3 rounded-xl border px-3 py-3 ${active ? "border-[#d6bd73]/50 bg-[#f0e3b4]/10" : "border-white/10 bg-white/[.04]"}`}>
    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-[#90b49a] text-[#244c47]" : active ? "bg-[#d6bd73] text-[#33463c]" : "border border-white/20 text-transparent"}`}>{done && <Check className="h-3 w-3"/>}</span>
    <div className="min-w-0"><p className={`text-xs font-bold ${active ? "text-[#f0dfaa]" : "text-[#e2e8de]"}`}>{label}</p><p className="mt-1 text-[11px] leading-5 text-[#afc1b5]">{detail}</p></div>
  </div>;
}

function UnavailableSection({ copy }: { copy: ReturnType<typeof loadingCopy> }) {
  return <section className="rounded-2xl border border-[#d5ddd4] bg-[#f8f9f5] px-5 py-9 text-center sm:py-14">
    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#d5ddd4] bg-[#e8eee7] text-[#547568]"><CircleHelp className="h-5 w-5"/></span>
    <h3 className="mt-4 text-lg font-bold text-[#304941]">{copy.notOperational}</h3>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#718078]">{copy.notOperationalText}</p>
    <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg border border-[#e1d5b8] bg-[#f5f0e3] px-3 py-2 text-xs font-semibold text-[#786744]"><LockKeyhole className="h-3.5 w-3.5"/>{copy.noWorkflow}</div>
  </section>;
}

function DisabledPanel({ copy }: { copy: ReturnType<typeof loadingCopy> }) {
  return <div role="status" className="flex items-start gap-3 rounded-xl border border-[#e1d5b8] bg-[#f7f1e4] px-4 py-4">
    <LockKeyhole className="h-5 w-5 text-[#90774a]"/><div><h3 className="font-bold text-[#685735]">{copy.disabled}</h3><p className="mt-1 text-sm leading-6 text-[#7b6d50]">{copy.disabledText}</p></div>
  </div>;
}

function ErrorPanel({ message, retry, copy }: { message: string; retry: () => void; copy: ReturnType<typeof loadingCopy> }) {
  return <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#e4c8bc] bg-[#f8ece7] px-4 py-4">
    <AlertTriangle className="h-5 w-5 text-[#a35d48]"/><div className="min-w-0 flex-1"><h3 className="font-bold text-[#794b3d]">{copy.error}</h3><p className="mt-1 break-words text-sm text-[#8b6c60]">{message}</p></div>
    <button type="button" onClick={retry} className="rounded-lg border border-[#d4b4a8] px-3 py-2 text-xs font-bold text-[#794b3d] transition-colors hover:bg-[#f3ded5]">{copy.retry}</button>
  </div>;
}

function LoadingPanel({ copy }: { copy: string }) {
  return <div role="status" className="space-y-4" aria-label={copy}>
    <div className="h-40 animate-pulse rounded-2xl bg-[#dfe7de]"/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-24 animate-pulse rounded-xl bg-[#dfe7de]"/>)}</div>
  </div>;
}

function NavSkeleton() {
  return <div aria-label="Loading sections" className="space-y-2 p-2">{[1, 2, 3].map(item => <div key={item} className="h-10 animate-pulse rounded-xl bg-[#e7ece5]"/> )}</div>;
}