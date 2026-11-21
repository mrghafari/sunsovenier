import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { productModelUrl } from "@shared/product-media";

interface ProductModel3DViewerProps {
  model3dKey: string;
  productName: string;
  className?: string;
}

// Declare model-viewer as a custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        ar?: boolean;
        'auto-rotate'?: boolean;
        'camera-controls'?: boolean;
        'shadow-intensity'?: string;
        'loading'?: string;
        'interaction-prompt'?: string;
        'reveal'?: string;
        style?: React.CSSProperties;
      }, HTMLElement>;
    }
  }
}

const viewerScriptUrl = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
let viewerReady: Promise<void> | undefined;

function loadViewer(): Promise<void> {
  if (customElements.get("model-viewer")) return Promise.resolve();
  viewerReady ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = viewerScriptUrl;
    script.onload = () => {
      if (customElements.get("model-viewer")) resolve();
      else reject(new Error("3D viewer did not register"));
    };
    script.onerror = () => reject(new Error("3D viewer did not load"));
    document.head.appendChild(script);
  }).catch(error => {
    viewerReady = undefined;
    throw error;
  });
  return viewerReady;
}

export default function ProductModel3DViewer({ model3dKey, productName, className = "" }: ProductModel3DViewerProps) {
  const { t, direction } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check WebGL/WebXR support before loading model-viewer
    const checkSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      } catch (e) {
        return false;
      }
    };

    // If WebGL is not supported, show error and don't load script
    if (!checkSupport()) {
      console.warn('WebGL not supported, 3D model viewer disabled');
      setError(true);
      setLoading(false);
      return;
    }

    let mounted = true;
    loadViewer().then(() => {
      if (mounted) setScriptLoaded(true);
    }, () => {
      if (mounted) {
        setError(true);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current as (HTMLElement & { loaded?: boolean }) | null;
    if (!viewer) return;
    const handleLoad = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError(true);
    };
    if (viewer.loaded) handleLoad();
    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);
    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
    };
  }, [scriptLoaded]);

  if (!model3dKey) {
    return null;
  }

  return (
    <div className={`relative ${className}`} dir={direction}>
      {/* Loading State */}
      {loading && (
        <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t.productManagement.loading3dModel}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400 text-center">
            {t.productManagement.error3dModel}
          </p>
        </div>
      )}

      {/* 3D Model Viewer */}
      {scriptLoaded && !error && (
        <div className="relative w-full h-full">
          <model-viewer
            ref={viewerRef}
            src={productModelUrl(model3dKey)}
            alt={productName}
            auto-rotate
            camera-controls
            shadow-intensity="1"
            loading="eager"
            interaction-prompt="auto"
            reveal="auto"
            ar={('xr' in navigator) ? true : undefined}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem'
            }}
          />
          
          {/* 3D Badge */}
          <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">
            3D
          </div>
        </div>
      )}
    </div>
  );
}
