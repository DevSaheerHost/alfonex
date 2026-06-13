'use client';

/**
 * Product3DViewer
 *
 * Wraps Google's <model-viewer> web component for interactive 3D product previews.
 * Features: auto-rotation, touch / mouse camera controls, responsive sizing,
 * poster-image fallback while the asset loads.
 *
 * Usage:
 *   <Product3DViewer src="/models/iphone-17-pro.glb" poster={product.imageUrl} />
 */

import { useEffect, useRef, useState } from 'react';

// ── TypeScript: teach JSX about the <model-viewer> custom element ──────────────
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          poster?: string;
          alt?: string;
          /** Continuously spins the model */
          'auto-rotate'?: boolean;
          /** Milliseconds to wait before starting auto-rotation */
          'auto-rotate-delay'?: number | string;
          /** Enables mouse drag and touch gestures */
          'camera-controls'?: boolean;
          /**
           * 'pan-y' lets the page scroll vertically on mobile while still
           * allowing horizontal drag to rotate the model.
           */
          'touch-action'?: string;
          'shadow-intensity'?: number | string;
          'shadow-softness'?: number | string;
          exposure?: number | string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'manual' | 'interaction';
          /** Enable AR (Android / iOS) */
          ar?: boolean;
          'ar-modes'?: string;
          'min-camera-orbit'?: string;
          'max-camera-orbit'?: string;
          'camera-orbit'?: string;
          'field-of-view'?: string;
        },
        HTMLElement
      >;
    }
  }
}

// ── Props ───────────────────────────────────────────────────────────────────────

interface Props {
  /** URL to the .glb or .gltf file (CDN or /public/models/*.glb) */
  src: string;
  /** Image shown while the 3D asset downloads — use the product's main image */
  poster?: string;
  alt?: string;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function Product3DViewer({
  src,
  poster,
  alt = '3D interactive product view',
  className = '',
}: Props) {
  const viewerRef = useRef<HTMLElement>(null);

  // 'ready' becomes true when model-viewer fires its 'load' event
  const [ready, setReady] = useState(false);
  // 'showHint' displays the interaction tooltip briefly after the model is ready
  const [showHint, setShowHint] = useState(false);

  // Dynamically import the library on the client side only.
  // model-viewer self-registers as a custom HTML element on import.
  useEffect(() => {
    import('@google/model-viewer').catch(() => {
      // If the import fails the poster image stays visible — acceptable fallback.
    });
  }, []);

  // Attach the 'load' event listener to the web component via ref.
  // We can't use React's synthetic events for custom element events.
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const handleLoad = () => {
      setReady(true);
      setShowHint(true);
      // Auto-hide the hint after 4 seconds
      setTimeout(() => setShowHint(false), 4000);
    };

    el.addEventListener('load', handleLoad);
    return () => el.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {/* ── Loading overlay ──────────────────────────────────────────────────── */}
      {/* Shown until the 3D asset is fully parsed and rendered for the first time */}
      {!ready && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
          {/* Blurred poster — gives users a preview while the model loads */}
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain p-6 opacity-40"
            />
          )}

          {/* Spinner + label */}
          <span className="relative z-10 flex flex-col items-center gap-2">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
            <span className="text-xs font-medium text-gray-400">Loading 3D model…</span>
          </span>
        </div>
      )}

      {/* ── model-viewer web component ───────────────────────────────────────── */}
      {/*
          Attributes summary:
            auto-rotate          → continuous slow spin
            auto-rotate-delay    → 800 ms pause before spin starts
            camera-controls      → drag/pinch to orbit and zoom
            touch-action="pan-y" → vertical page scroll still works on mobile
            shadow-intensity     → subtle ground shadow for realism
            exposure             → scene brightness (1.1 = slightly brighter than default)
            loading="eager"      → start fetching the model immediately
            reveal="auto"        → fade in once parsed (hides the raw WebGL flash)
      */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <model-viewer
        ref={viewerRef}
        src={src}
        poster={poster}
        alt={alt}
        auto-rotate
        auto-rotate-delay="800"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="0.8"
        shadow-softness="0.5"
        exposure="1.1"
        loading="eager"
        reveal="auto"
        style={
          {
            width: '100%',
            height: '100%',
            // Transparent poster background so our custom overlay shows through
            '--poster-color': 'transparent',
          } as React.CSSProperties
        }
      />

      {/* ── Interaction hint ─────────────────────────────────────────────────── */}
      {/* Fades in when the model is ready, fades out automatically after 4 s */}
      <div
        className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 transition-opacity duration-700 ${
          showHint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          <i className="fa-solid fa-arrows-rotate text-[9px]" />
          Drag to rotate · Pinch to zoom
        </span>
      </div>
    </div>
  );
}
