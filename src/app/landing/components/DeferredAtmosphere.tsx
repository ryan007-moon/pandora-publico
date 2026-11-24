'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SectionAtmosphere = dynamic(() => import('./SectionAtmosphere'), { ssr: false });

/**
 * Keep the CSS atmosphere and hero photograph immediately visible.
 * WebGL is a progressive enhancement: avoid parsing Three.js or creating a
 * GPU context during the critical first paint and initial interactions.
 * Start after a genuine interaction when the browser is idle, or after the
 * initial page has settled for visitors who stay on the landing page.
 */
export default function DeferredAtmosphere() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    let scheduled = false;
    let delayId: number | undefined;
    let idleId: number | undefined;

    const clearScheduled = () => {
      if (delayId !== undefined) window.clearTimeout(delayId);
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      delayId = undefined;
      idleId = undefined;
    };
    const enable = () => {
      if (!active) return;
      clearScheduled();
      setEnabled(true);
    };
    const schedule = (timeout: number) => {
      if (!active || scheduled) return;
      scheduled = true;
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(enable, { timeout });
      } else {
        delayId = window.setTimeout(enable, 180);
      }
    };
    const onIntent = () => {
      if (scheduled) return;
      if (delayId !== undefined) window.clearTimeout(delayId);
      schedule(1200);
    };
    const onLoad = () => {
      // Idle visitors still get the cinematic scene; returning visitors get
      // immediately usable navigation instead of a WebGL compilation spike.
      if (!scheduled) delayId = window.setTimeout(() => schedule(2500), 6500);
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    window.addEventListener('scroll', onIntent, { passive: true, once: true });
    window.addEventListener('pointerdown', onIntent, { passive: true, once: true });
    window.addEventListener('keydown', onIntent, { once: true });
    window.addEventListener('pandora:palette', onIntent);

    return () => {
      active = false;
      clearScheduled();
      window.removeEventListener('load', onLoad);
      window.removeEventListener('scroll', onIntent);
      window.removeEventListener('pointerdown', onIntent);
      window.removeEventListener('keydown', onIntent);
      window.removeEventListener('pandora:palette', onIntent);
    };
  }, []);

  return enabled ? <SectionAtmosphere /> : null;
}
