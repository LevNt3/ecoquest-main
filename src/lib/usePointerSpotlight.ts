import {useEffect} from 'react';

const SPOTLIGHT_SELECTOR = [
  '[data-spotlight]',
  '.eq-animate-card',
  '.eq-interactive-btn',
  '[class*="bg-[var(--bg-surface)]"]',
].join(', ');

/** Marks the single surface that currently owns the cursor glow. */
const ACTIVE_CLASS = 'eq-spotlight-on';

/** How quickly the glow catches up with the pointer (0..1 per frame). */
const FOLLOW_EASING = 0.22;

/** Layout changes (scroll, resize, accordions) refresh the cached rect at this rate. */
const RECT_REFRESH_MS = 250;

/**
 * Cursor spotlight for pointer devices plus a themed touch ripple:
 * - Pointer: smoothly eases a themed radial highlight toward the cursor inside
 *   cards, controls and glass panels (`--eq-pointer-x` / `--eq-pointer-y`).
 *   Only the innermost hovered surface is marked active, so nested surfaces
 *   (a quest row inside a glass list panel, for example) never paint a second
 *   highlight that would freeze where the pointer entered.
 * - Touch: spawns a soft wave from the touch point (`--eq-ripple-*`).
 */
export function usePointerSpotlight() {
  useEffect(() => {
    let frame = 0;
    let activeEl: HTMLElement | null = null;
    let activeRect: DOMRect | null = null;
    let rectStamp = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastClientX = 0;
    let lastClientY = 0;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function writePosition() {
      if (!activeEl) return;
      activeEl.style.setProperty('--eq-pointer-x', `${currentX}px`);
      activeEl.style.setProperty('--eq-pointer-y', `${currentY}px`);
    }

    function tick() {
      frame = 0;
      if (!activeEl) return;

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const settled = Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4;

      if (reduceMotion.matches || settled) {
        currentX = targetX;
        currentY = targetY;
      } else {
        currentX += dx * FOLLOW_EASING;
        currentY += dy * FOLLOW_EASING;
      }

      writePosition();

      if (!settled && !reduceMotion.matches) {
        frame = requestAnimationFrame(tick);
      }
    }

    function requestTick() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    /** Moves the glow to `el` and clears every other surface. */
    function setActive(el: HTMLElement | null) {
      if (el === activeEl) return;
      if (activeEl) activeEl.classList.remove(ACTIVE_CLASS);
      activeEl = el;
      activeRect = null;
      if (el) el.classList.add(ACTIVE_CLASS);
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch') return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      lastClientX = event.clientX;
      lastClientY = event.clientY;

      const el = target.closest<HTMLElement>(SPOTLIGHT_SELECTOR);
      if (!el) {
        setActive(null);
        return;
      }

      if (el !== activeEl) {
        setActive(el);
        activeRect = el.getBoundingClientRect();
        rectStamp = performance.now();
        currentX = targetX = event.clientX - activeRect.left;
        currentY = targetY = event.clientY - activeRect.top;
        const size = Math.round(
          Math.min(320, Math.max(150, Math.min(activeRect.width, activeRect.height) * 0.9)),
        );
        el.style.setProperty('--eq-spotlight-size', `${size}px`);
        writePosition();
        return;
      }

      if (!activeRect || performance.now() - rectStamp > RECT_REFRESH_MS) {
        activeRect = el.getBoundingClientRect();
        rectStamp = performance.now();
      }

      targetX = event.clientX - activeRect.left;
      targetY = event.clientY - activeRect.top;
      requestTick();
    }

    /** Keeps the glow anchored while a scroll container moves under the pointer. */
    function handleScroll() {
      if (!activeEl) return;
      activeRect = activeEl.getBoundingClientRect();
      rectStamp = performance.now();
      targetX = lastClientX - activeRect.left;
      targetY = lastClientY - activeRect.top;
      requestTick();
    }

    function handleResize() {
      if (!activeEl) return;
      activeRect = activeEl.getBoundingClientRect();
      rectStamp = performance.now();
      targetX = lastClientX - activeRect.left;
      targetY = lastClientY - activeRect.top;
      requestTick();
    }

    function spawnRipple(el: HTMLElement, clientX: number, clientY: number) {
      const rect = el.getBoundingClientRect();
      const size = Math.round(Math.min(1200, Math.max(rect.width, rect.height) * 2.2));

      const ripple = document.createElement('span');
      ripple.className = 'eq-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.setProperty('--eq-ripple-x', `${clientX - rect.left}px`);
      ripple.style.setProperty('--eq-ripple-y', `${clientY - rect.top}px`);
      ripple.style.setProperty('--eq-ripple-size', `${size}px`);

      el.classList.add('eq-ripple-host');
      el.appendChild(ripple);

      let finished = false;
      let timeoutId = 0;

      function cleanup() {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeoutId);
        ripple.remove();
        if (!el.querySelector('.eq-ripple')) {
          el.classList.remove('eq-ripple-host');
        }
      }

      ripple.addEventListener('animationend', cleanup, {once: true});
      timeoutId = window.setTimeout(cleanup, 900);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse') return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const el = target.closest<HTMLElement>(SPOTLIGHT_SELECTOR);
      if (!el) return;

      spawnRipple(el, event.clientX, event.clientY);
    }

    /** Drops the glow when the pointer leaves the viewport or the window blurs. */
    function handlePointerLeave() {
      setActive(null);
    }

    window.addEventListener('pointermove', handlePointerMove, {passive: true});
    window.addEventListener('pointerdown', handlePointerDown, {passive: true});
    window.addEventListener('scroll', handleScroll, {passive: true, capture: true});
    window.addEventListener('resize', handleResize, {passive: true});
    window.addEventListener('blur', handlePointerLeave);
    document.documentElement.addEventListener('pointerleave', handlePointerLeave, {passive: true});

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, {capture: true});
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handlePointerLeave);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      if (frame) cancelAnimationFrame(frame);
      if (activeEl) activeEl.classList.remove(ACTIVE_CLASS);
      activeEl = null;
    };
  }, []);
}
