import { useState, useEffect, useRef } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { X, Download, Wifi, WifiOff, Smartphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const installCopy = {
  fa: {
    title: 'نصب اپ ممتازکم',
    body: 'فروشگاه را روی گوشی نصب کنید و سریع‌تر خرید کنید',
    install: 'نصب',
    later: 'بعداً',
  },
  ar: {
    title: 'تثبيت تطبيق ممتازكم',
    body: 'ثبّت المتجر على هاتفك لتتسوق بشكل أسرع',
    install: 'تثبيت',
    later: 'لاحقاً',
  },
  tr: {
    title: 'Mumtazcom uygulamasını yükleyin',
    body: 'Daha hızlı alışveriş için mağazayı telefonunuza yükleyin',
    install: 'Yükle',
    later: 'Daha sonra',
  },
  en: {
    title: 'Install the Mumtazcom app',
    body: 'Install the store on your phone for faster shopping',
    install: 'Install',
    later: 'Later',
  },
} as const;

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isOnline, installApp, dismissInstall } = usePWA();
  const { language, direction } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = installCopy[language] || installCopy.en;

  useEffect(() => {
    if (!isInstallable || isInstalled) return;
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const diff = Date.now() - parseInt(dismissed);
      if (diff < 7 * 24 * 60 * 60 * 1000) return;
    }
    const showTimer = setTimeout(() => {
      setShowPrompt(true);
      // Auto-dismiss after 5 seconds
      autoDismissRef.current = setTimeout(() => {
        setShowPrompt(false);
        dismissInstall();
      }, 5000);
    }, 5000);
    return () => {
      clearTimeout(showTimer);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [isInstallable, isInstalled]);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineBanner(true);
    } else {
      const timer = setTimeout(() => setShowOfflineBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleDismiss = () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    setShowPrompt(false);
    dismissInstall();
  };

  const handleInstall = async () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    await installApp();
    setShowPrompt(false);
  };

  return (
    <>
      {/* Offline/Online status banner */}
      {showOfflineBanner && (
        <div
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300 ${
            isOnline ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>اتصال اینترنت برقرار شد</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>اتصال اینترنت قطع است — برخی محتوا از حافظه نمایش داده می‌شود</span>
            </>
          )}
        </div>
      )}

      {/* Install prompt — bottom banner, auto-dismissed after 5s */}
      {showPrompt && (
        <div
          dir={direction}
          className="fixed bottom-20 left-4 right-4 z-[9998] mx-auto max-w-sm bg-white border border-blue-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300 md:bottom-4"
        >
          <div className="flex-shrink-0 w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">{copy.title}</p>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
              {copy.body}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {copy.install}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-gray-500 text-xs h-8 px-3 rounded-lg"
              >
                {copy.later}
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label={copy.later}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      )}
    </>
  );
}

export function PWAOfflineFallback() {
  const { isOnline } = usePWA();
  if (isOnline) return null;
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-8 text-center"
    >
      <WifiOff className="w-16 h-16 text-gray-300 mb-6" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">اتصال اینترنت ندارید</h2>
      <p className="text-gray-500 text-sm mb-6">
        لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید
      </p>
      <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
        تلاش مجدد
      </Button>
    </div>
  );
}
