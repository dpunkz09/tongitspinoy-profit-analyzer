'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAX_ZOOM, MIN_ZOOM } from '../_lib/config';

const STEP = 1.2;

const clamp = (value: number) =>
  Number.isFinite(value) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) : 1;

/** Rounds to 2 places and snaps to exactly 100% when close, so "reset" is easy to hit. */
const tidy = (value: number) => {
  const z = Math.round(clamp(value) * 100) / 100;
  return Math.abs(z - 1) < 0.04 ? 1 : z;
};

/** The point being held still while the zoom changes, in unzoomed table units. */
interface Anchor {
  /** Position inside the table at zoom 1. */
  x: number;
  y: number;
  /** Where that point sits inside the visible scroll area, in screen pixels. */
  px: number;
  py: number;
}

const distance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/**
 * Wraps a table in a scroll area that can be pinched. Zooming shrinks text, padding and
 * column widths together, so more columns fit on screen. The zoom level is remembered
 * by the parent (through `onZoomChange`).
 */
export function ZoomableTable({
  zoom,
  onZoomChange,
  className = '',
  children,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** Classes for the scroll area (height limit, overflow, ...). */
  className?: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // While fingers are down the zoom lives here; the parent is told once, when they lift.
  const [live, setLive] = useState<number | null>(null);
  const shown = clamp(live ?? zoom);

  const shownRef = useRef(shown);
  const anchorRef = useRef<Anchor | null>(null);
  const callbackRef = useRef(onZoomChange);
  useEffect(() => {
    shownRef.current = shown;
    callbackRef.current = onZoomChange;
  });

  // After the new size is laid out, scroll so the anchor point stays under the fingers.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    anchorRef.current = null;
    el.scrollLeft = anchor.x * shown - anchor.px;
    el.scrollTop = anchor.y * shown - anchor.py;
  }, [shown]);

  /** Used by the − / + buttons: zooms around the middle of what is on screen. */
  const zoomTo = useCallback((next: number) => {
    const el = scrollRef.current;
    const target = tidy(next);
    if (el && target !== shownRef.current) {
      const z = shownRef.current;
      const px = el.clientWidth / 2;
      const py = el.clientHeight / 2;
      anchorRef.current = { x: (el.scrollLeft + px) / z, y: (el.scrollTop + py) / z, px, py };
    }
    callbackRef.current(target);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let startDistance = 0;
    let startZoom = 1;
    let anchor: Anchor | null = null;
    let latest = 1;
    let frame = 0;

    const center = (a: Touch, b: Touch) => {
      const box = el.getBoundingClientRect();
      return {
        px: (a.clientX + b.clientX) / 2 - box.left,
        py: (a.clientY + b.clientY) / 2 - box.top,
      };
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const [a, b] = [event.touches[0], event.touches[1]];
      startDistance = distance(a, b) || 1;
      startZoom = shownRef.current;
      latest = startZoom;
      const { px, py } = center(a, b);
      const z = shownRef.current;
      anchor = { x: (el.scrollLeft + px) / z, y: (el.scrollTop + py) / z, px, py };
    };

    const onMove = (event: TouchEvent) => {
      if (!anchor || event.touches.length !== 2) return;
      // Stops the browser zooming the whole page while the table is being pinched.
      if (event.cancelable) event.preventDefault();

      const [a, b] = [event.touches[0], event.touches[1]];
      latest = clamp(startZoom * (distance(a, b) / startDistance));
      // The fingers may also drift while pinching, so the anchor follows them.
      const { px, py } = center(a, b);
      anchor = { ...anchor, px, py };

      // At most one re-render per screen frame.
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        if (!anchor) return;
        anchorRef.current = anchor;
        setLive(latest);
      });
    };

    const onEnd = (event: TouchEvent) => {
      if (!anchor || event.touches.length >= 2) return;
      cancelAnimationFrame(frame);
      frame = 0;
      const finished = tidy(latest);
      anchorRef.current = anchor;
      anchor = null;
      setLive(null);
      callbackRef.current(finished);
    };

    // Safari also reports pinches as "gesture" events and zooms the page unless stopped.
    const blockGesture = (event: Event) => event.preventDefault();

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    el.addEventListener('gesturestart', blockGesture);
    el.addEventListener('gesturechange', blockGesture);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      el.removeEventListener('gesturestart', blockGesture);
      el.removeEventListener('gesturechange', blockGesture);
    };
  }, []);

  const percent = Math.round(shown * 100);
  const small =
    'inline-flex h-8 min-w-8 items-center justify-center rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40';

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5 sm:px-5">
        <p className="hidden text-xs text-slate-500 [@media(pointer:coarse)]:block">
          Pinch the table to zoom
        </p>
        <div role="group" aria-label="Table zoom" className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={shown <= MIN_ZOOM}
            onClick={() => zoomTo(shown / STEP)}
            className={small}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Reset zoom to 100%"
            disabled={percent === 100}
            onClick={() => zoomTo(1)}
            className={`${small} w-14 tabular-nums`}
          >
            {percent}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={shown >= MAX_ZOOM}
            onClick={() => zoomTo(shown * STEP)}
            className={small}
          >
            +
          </button>
        </div>
      </div>

      {/* pan-x/pan-y: scrolling stays native, but pinching is left to the code above. */}
      <div ref={scrollRef} className={className} style={{ touchAction: 'pan-x pan-y' }}>
        {/* `zoom` (unlike transform) changes the layout size, so columns really do reflow. */}
        <div style={{ zoom: shown }}>{children}</div>
      </div>
    </div>
  );
}
