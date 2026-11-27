import {useEffect} from 'react';

/**
 * Tracks the pointer over any element marked with `data-spotlight` and exposes
 * the pointer position as `--eq-pointer-x` / `--eq-pointer-y` CSS variables,
 * so a themed radial highlight can follow the cursor inside that surface.
 */
export function usePointerSpotlight() {
  useEffect(() => {
    let frame = 0;
    let pending: {el: HTMLElement; x: number; y: number} | null = null;

    function apply() {
      frame = 0;
      if (!pending) return;
      const {el, x, y} = pending;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--eq-pointer-x', `${x - rect.left}px`);
      el.style.setProperty('--eq-pointer-y', `${y - rect.top}px`);
    }

    function handlePointerMove(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>('[data-spotlight]');
      if (!el) return;
      pending = {el, x: event.clientX, y: event.clientY};
      if (!frame) frame = requestAnimationFrame(apply);
    }

    window.addEventListener('pointermove', handlePointerMove, {passive: true});
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
