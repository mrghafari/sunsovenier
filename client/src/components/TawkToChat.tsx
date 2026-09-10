import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X } from 'lucide-react';

interface TawkSettings {
  isEnabled: boolean;
  scriptCode: string;
}

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: any;
  }
}

export default function TawkToChat() {
  const scriptLoadedRef = useRef(false);
  const lastEnabledState = useRef<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [isMobileWidgetVisible, setIsMobileWidgetVisible] = useState(false);
  
  const { data: tawkSettings, refetch } = useQuery<{ success: boolean; data: TawkSettings }>({
    queryKey: ['/api/tawk-support'],
    refetchInterval: 10000, // Check every 10 seconds
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
  });

  // Listen for custom tawk settings update event
  useEffect(() => {
    const handleTawkUpdate = () => {
      console.log('🔄 Tawk settings update event received, refetching...');
      refetch();
    };
    
    window.addEventListener('tawk-settings-updated', handleTawkUpdate);
    return () => window.removeEventListener('tawk-settings-updated', handleTawkUpdate);
  }, [refetch]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (window.Tawk_API) {
        if (mobile && typeof window.Tawk_API.hideWidget === 'function') {
          window.Tawk_API.hideWidget();
          setIsMobileWidgetVisible(false);
        } else if (!mobile && typeof window.Tawk_API.showWidget === 'function') {
          window.Tawk_API.showWidget();
        }
      }
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    const isEnabled = tawkSettings?.success && tawkSettings.data?.isEnabled;
    const scriptCode = tawkSettings?.data?.scriptCode;

    const removeTawkWidget = () => {
      console.log('🔄 Attempting to remove Tawk.to widget...');
      
      // Remove all Tawk.to scripts
      const tawkScripts = document.querySelectorAll('script[src*="tawk.to"], script[data-tawk-script="true"]');
      tawkScripts.forEach(script => {
        script.remove();
        console.log('🗑️ Removed Tawk.to script:', script.getAttribute('src'));
      });
      
      // Remove all Tawk.to widget containers and iframes
      const tawkContainers = document.querySelectorAll(
        '[id^="tawk"], [class*="tawk"], div[style*="tawk"], iframe[src*="tawk"]'
      );
      tawkContainers.forEach(container => {
        container.remove();
        console.log('🗑️ Removed Tawk.to container:', container.id || container.className);
      });
      
      // Clear Tawk API objects
      if (window.Tawk_API) {
        try {
          if (typeof window.Tawk_API.hideWidget === 'function') {
            window.Tawk_API.hideWidget();
            console.log('👻 Hid Tawk.to widget');
          }
          if (typeof window.Tawk_API.onLoad === 'function') {
            window.Tawk_API.onLoad = null;
          }
        } catch (e) {
          console.log('⚠️ Could not interact with Tawk API:', e);
        }
        delete window.Tawk_API;
        delete window.Tawk_LoadStart;
        setWidgetReady(false);
        setIsMobileWidgetVisible(false);
        console.log('🧹 Cleared Tawk API objects');
      }
      
      scriptLoadedRef.current = false;
      lastEnabledState.current = false;
      console.log('✅ Tawk.to Live Chat completely removed');
    };
    
    // Check if enabled state changed
    const hasStateChanged = lastEnabledState.current !== null && lastEnabledState.current !== isEnabled;
    
    if (isEnabled && scriptCode) {
      // Chat is enabled
      if (hasStateChanged && lastEnabledState.current === false) {
        console.log('🔄 State changed from disabled to enabled');
        // Remove old widget first
        removeTawkWidget();
      }
      
      // Only load if not already loaded
      if (scriptLoadedRef.current) {
        console.log('ℹ️ Tawk.to already loaded, skipping');
        lastEnabledState.current = true;
        return;
      }

      const scriptMatch = scriptCode.match(/src=['"]([^'"]+)['"]/);
      if (scriptMatch && scriptMatch[1]) {
        const scriptSrc = scriptMatch[1];
        
        // Check if script already exists
        const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
        if (existingScript) {
          scriptLoadedRef.current = true;
          lastEnabledState.current = true;
          console.log('ℹ️ Tawk.to script already in DOM');
          return;
        }
        
        // Initialize Tawk API objects before loading script
        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_LoadStart = new Date();
        
        // Set widget position to bottom-left
        window.Tawk_API.customStyle = {
          visibility: {
            desktop: {
              position: 'bl', // bottom-left
              xOffset: 20,
              yOffset: 20
            },
            mobile: {
              position: 'bl', // bottom-left on mobile
              xOffset: 52,
              // Keep the launcher above the mobile bottom navigation/account button.
              yOffset: 80
            }
          }
        };

        window.Tawk_API.onLoad = () => {
          setWidgetReady(true);
          if (window.matchMedia('(max-width: 767px)').matches) {
            window.Tawk_API?.hideWidget?.();
            setIsMobileWidgetVisible(false);
          }
        };
        
        console.log('📥 Loading Tawk.to widget at bottom-left position...');
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.charset = 'UTF-8';
        script.setAttribute('crossorigin', '*');
        script.setAttribute('data-tawk-script', 'true');
        
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(script, firstScript);
          
          script.onload = () => {
            scriptLoadedRef.current = true;
            lastEnabledState.current = true;
            console.log('✅ Tawk.to Live Chat loaded successfully at bottom-left');
          };
          
          script.onerror = () => {
            scriptLoadedRef.current = false;
            lastEnabledState.current = false;
            console.error('❌ Failed to load Tawk.to script');
          };
        }
      }
    } else if (tawkSettings?.success) {
      // Settings exist and chat is disabled
      if (!isEnabled && (scriptLoadedRef.current || hasStateChanged)) {
        console.log('🔄 Chat is disabled, removing widget...');
        removeTawkWidget();
      }
    }
  }, [tawkSettings]);

  const toggleMobileWidget = () => {
    if (!window.Tawk_API || !widgetReady) return;

    if (isMobileWidgetVisible) {
      window.Tawk_API.hideWidget?.();
      setIsMobileWidgetVisible(false);
    } else {
      window.Tawk_API.showWidget?.();
      setIsMobileWidgetVisible(true);
    }
  };

  const isEnabled = Boolean(tawkSettings?.success && tawkSettings.data?.isEnabled);

  if (!isEnabled || !isMobile) return null;

  return (
    <button
      type="button"
      onClick={toggleMobileWidget}
      disabled={!widgetReady}
      aria-label={isMobileWidgetVisible ? 'Hide chat' : 'Show chat'}
      title={isMobileWidgetVisible ? 'Hide chat' : 'Show chat'}
      className={`fixed bottom-[5.25rem] left-0 z-[2147483000] flex h-11 w-10 items-center justify-center rounded-r-full bg-blue-600 text-white shadow-lg transition-transform duration-200 disabled:cursor-wait disabled:opacity-60 md:hidden ${
        isMobileWidgetVisible ? 'translate-x-0' : '-translate-x-7'
      }`}
    >
      {isMobileWidgetVisible ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
    </button>
  );
}
