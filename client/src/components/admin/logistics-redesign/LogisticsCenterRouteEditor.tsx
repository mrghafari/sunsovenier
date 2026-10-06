import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, MapPinned, Ruler, Save, TriangleAlert } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LogisticsLanguage } from '@/pages/admin/logistics-translations';

type Place = { id?: number; code?: string; countryCode?: string; country_code?: string; name?: string; nameEn?: string; name_en?: string; nameEnglish?: string; nameArabic?: string; name_arabic?: string; nameFa?: string; name_fa?: string; namePersian?: string; nameTr?: string; name_tr?: string; nameTurkish?: string; provinceId?: number; cityId?: number };
type ApiResult<T> = { success?: boolean; data?: T };
type Props = { t: (key: string) => string };

const labelFor = (item: Place, language: LogisticsLanguage) =>
  language === 'fa' ? item.namePersian || item.nameFa || item.name_fa || item.name || item.nameEnglish || '' :
  language === 'ar' ? item.nameArabic || item.name_arabic || item.name || item.nameEnglish || '' :
  language === 'tr' ? item.nameTurkish || item.nameTr || item.name_tr || item.name || item.nameEnglish || '' :
  item.nameEnglish || item.nameEn || item.name_en || item.name || item.nameArabic || '';

export default function LogisticsCenterRouteEditor({ t }: Props) {
  const { language: rawLanguage } = useLanguage();
  const language = (['en', 'fa', 'ar', 'tr'].includes(rawLanguage) ? rawLanguage : 'en') as LogisticsLanguage;
  const queryClient = useQueryClient();
  const [countryCode, setCountryCode] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [destinationRegion, setDestinationRegion] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [distance, setDistance] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const countriesQuery = useQuery<ApiResult<Place[]>>({ queryKey: ['/api/geography/countries'] });
  const centerQuery = useQuery<ApiResult<{ countryCode: string; provinceId: number; cityId: number }>>({ queryKey: ['/api/admin/logistics/shipping-center'] });
  const originRegionsQuery = useQuery<ApiResult<Place[]>>({ queryKey: [`/api/geography/regions?country=${countryCode}`], enabled: Boolean(countryCode) });
  const originCitiesQuery = useQuery<ApiResult<Place[]>>({ queryKey: [`/api/geography/cities?regionId=${provinceId}`], enabled: Boolean(provinceId) });
  const destinationRegionsQuery = useQuery<ApiResult<Place[]>>({ queryKey: [`/api/geography/regions?country=${destinationCountry}`], enabled: Boolean(destinationCountry) });
  const destinationCitiesQuery = useQuery<ApiResult<Place[]>>({ queryKey: [`/api/geography/cities?regionId=${destinationRegion}`], enabled: Boolean(destinationRegion) });
  const routesQuery = useQuery<ApiResult<Array<{ originCityId: number; destinationCityId: number; distanceKm: number; source?: string }>>>({
    queryKey: [`/api/admin/logistics/route-distances?originCityId=${cityId}`],
    enabled: Boolean(cityId),
  });

  const countries = countriesQuery.data?.data || [];
  const originRegions = originRegionsQuery.data?.data || [];
  const originCities = originCitiesQuery.data?.data || [];
  const destinationRegions = destinationRegionsQuery.data?.data || [];
  const destinationCities = destinationCitiesQuery.data?.data || [];
  const routes = routesQuery.data?.data || [];
  const selectedRoute = routes.find((route) => route.destinationCityId === Number(destinationCity));

  useEffect(() => {
    const center = centerQuery.data?.data;
    if (center && !initialized) {
      setCountryCode(center.countryCode || '');
      setDestinationCountry(center.countryCode || '');
      setProvinceId(String(center.provinceId || ''));
      setCityId(String(center.cityId || ''));
      setInitialized(true);
    }
  }, [centerQuery.data, initialized]);
  useEffect(() => {
    if (countryCode) {
      setDestinationCountry(countryCode);
      setDestinationRegion('');
      setDestinationCity('');
    }
  }, [countryCode]);
  useEffect(() => {
    if (selectedRoute) setDistance(String(selectedRoute.distanceKm));
    else setDistance('');
  }, [selectedRoute]);

  const persistedCenter = centerQuery.data?.data;
  const persistedCityId = persistedCenter?.cityId;
  const saveCenter = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/logistics/shipping-center', { method: 'PUT', body: { countryCode, provinceId: Number(provinceId), cityId: Number(cityId) } });
      if (!response?.success) throw new Error(t('saveError'));
      return response;
    },
    onSuccess: () => {
      setFeedback({ kind: 'success', message: t('centerSaveSuccess') });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/logistics/shipping-center'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/shipping-center'] });
      if (persistedCityId) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/logistics/route-distances?originCityId=${persistedCityId}`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/admin/logistics/route-distances?originCityId=${cityId}`] });
    },
    onError: () => setFeedback({ kind: 'error', message: t('saveError') }),
  });
  const saveRoute = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/logistics/route-distances', { method: 'PUT', body: { originCityId: Number(cityId), destinationCityId: Number(destinationCity), distanceKm: Number(distance) } });
      if (!response?.success) throw new Error(t('saveError'));
      return response;
    },
    onSuccess: () => {
      setFeedback({ kind: 'success', message: t('routeSaveSuccess') });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/logistics/route-distances?originCityId=${cityId}`] });
    },
    onError: () => setFeedback({ kind: 'error', message: t('saveError') }),
  });
  const persistedCity = originCities.find((item) => Number(item.id ?? item.cityId) === Number(persistedCenter?.cityId));
  const countryValue = (item: Place) => item.code || item.countryCode || item.country_code || '';

  const selectClass = 'h-11 w-full rounded-xl border border-[#d5e1dc] bg-white px-3 text-sm text-[#264c43] outline-none transition focus:border-[#3b8068] focus:ring-2 focus:ring-[#cde6d9] disabled:cursor-not-allowed disabled:bg-[#f1f5f2]';
  return (
    <section className="mb-6 overflow-hidden rounded-[1.5rem] border border-[#cddbd6] bg-[#f8fbf9] shadow-[0_20px_50px_-35px_rgba(24,61,54,0.7)]">
      <div className="border-b border-[#dce8e2] bg-[#edf5f0] px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3"><div className="rounded-2xl bg-[#d5e9de] p-3 text-[#2d7058]"><MapPinned className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-[#183d36]">{t('dispatchCenter')}</h2><p className="mt-1 text-sm text-[#648078]">{t('dispatchCenterDescription')}</p></div></div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e0f1e6] px-3 py-1.5 text-xs font-medium text-[#327353]"><Check className="h-3.5 w-3.5" />{persistedCity ? labelFor(persistedCity, language) : t('centerNotSet')}</span>
        </div>
      </div>
      <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[0.95fr_1.05fr]">
        {feedback && <div className={`lg:col-span-2 rounded-xl border p-3 text-sm ${feedback.kind === 'success' ? 'border-[#c4dfcf] bg-[#eef9f1] text-[#327353]' : 'border-[#e7c9c2] bg-[#fff3f0] text-[#914d40]'}`}>{feedback.message}</div>}
        {(countriesQuery.isError || centerQuery.isError) && <div className="lg:col-span-2 flex items-start gap-2 rounded-xl border border-[#e7c9c2] bg-[#fff3f0] p-3 text-sm text-[#914d40]"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('geographyLoadError')}</span></div>}
        {countriesQuery.isLoading && <div className="lg:col-span-2 grid gap-2 sm:grid-cols-3"><div className="h-11 animate-pulse rounded-xl bg-[#e5eee9]" /><div className="h-11 animate-pulse rounded-xl bg-[#e5eee9]" /><div className="h-11 animate-pulse rounded-xl bg-[#e5eee9]" /></div>}
        <div>
          <div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#2f745c] text-xs font-bold text-white">1</span><h3 className="font-semibold text-[#264c43]">{t('originCenter')}</h3></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-[#688078]">{t('country')}<select className={selectClass} value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setProvinceId(''); setCityId(''); }}><option value="">{t('select')}</option>{countries.map((item) => <option key={countryValue(item) || item.id} value={countryValue(item)}>{labelFor(item, language)}</option>)}</select></label>
            <label className="text-xs font-medium text-[#688078]">{t('province')}<select className={selectClass} value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setCityId(''); }} disabled={!countryCode}><option value="">{t('select')}</option>{originRegions.map((item) => <option key={item.id} value={item.id}>{labelFor(item, language)}</option>)}</select></label>
            <label className="text-xs font-medium text-[#688078]">{t('city')}<select className={selectClass} value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!provinceId}><option value="">{t('select')}</option>{originCities.map((item) => <option key={item.id} value={item.id}>{labelFor(item, language)}</option>)}</select></label>
          </div>
          <button type="button" onClick={() => saveCenter.mutate()} disabled={!countryCode || !provinceId || !cityId || saveCenter.isPending} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#286b53] px-4 text-sm font-semibold text-white transition hover:bg-[#1f5944] disabled:opacity-50"><Save className="h-4 w-4" />{saveCenter.isPending ? t('saving') : t('saveCenter')}</button>
        </div>
        <div className="border-t border-[#e0e9e4] pt-6 lg:border-s lg:border-t-0 lg:ps-7 lg:pt-0">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#b77937] text-xs font-bold text-white">2</span><div><h3 className="font-semibold text-[#264c43]">{t('destinationDistance')}</h3><p className="mt-0.5 text-xs font-normal text-[#71857e]">{t('routeScopeDescription')}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-[#688078]">{t('country')}<select className={selectClass} value={destinationCountry} disabled><option value="">{t('select')}</option>{countries.filter((item) => countryValue(item) === countryCode).map((item) => <option key={countryValue(item)} value={countryValue(item)}>{labelFor(item, language)}</option>)}</select></label>
            <label className="text-xs font-medium text-[#688078]">{t('province')}<select className={selectClass} value={destinationRegion} onChange={(e) => { setDestinationRegion(e.target.value); setDestinationCity(''); }} disabled={!destinationCountry}><option value="">{t('select')}</option>{destinationRegions.map((item) => <option key={item.id} value={item.id}>{labelFor(item, language)}</option>)}</select></label>
            <label className="text-xs font-medium text-[#688078]">{t('city')}<select className={selectClass} value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} disabled={!destinationRegion}><option value="">{t('select')}</option>{destinationCities.map((item) => <option key={item.id} value={item.id}>{labelFor(item, language)}</option>)}</select></label>
          </div>
          {cityId && destinationCity && !selectedRoute && !routesQuery.isLoading && !routesQuery.isError && <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#ecd9b9] bg-[#fff8eb] p-3 text-xs leading-5 text-[#8c632f]"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('routeMissing')}</span></div>}
          {destinationCity && selectedRoute && <div className="mt-3 flex items-center gap-2 text-xs text-[#52746a]"><Ruler className="h-4 w-4" />{t('routeSource')}: {selectedRoute.source || t('manual')}</div>}
          <div className="mt-4 flex items-end gap-2"><label className="flex-1 text-xs font-medium text-[#688078]">{t('distanceKm')}<input type="number" min="0" step="0.1" className={selectClass} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder={t('notSet')} disabled={!destinationCity} /></label><button type="button" onClick={() => saveRoute.mutate()} disabled={!cityId || !destinationCity || !distance || saveRoute.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#b77937] px-4 text-sm font-semibold text-white transition hover:bg-[#965f2b] disabled:opacity-50"><Save className="h-4 w-4" />{t('saveRoute')}</button></div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-[#dce8e2] bg-white/60 px-5 py-3 text-xs text-[#6a817a] md:px-7"><ChevronRight className="h-4 w-4" /><span>{routes.length} {t('routesCovered')}</span><span className="ms-auto">{t('missingRoutesExplicit')}</span></div>
    </section>
  );
}