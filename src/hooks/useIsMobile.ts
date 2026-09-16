import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the current viewport is mobile (< 768px).
 * Uses window.matchMedia for performant, listener-based responsiveness.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const updateMatch = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Initial check
    setIsMobile(mediaQuery.matches);

    // Modern and fallback listeners
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatch);
      return () => mediaQuery.removeEventListener('change', updateMatch);
    } else {
      mediaQuery.addListener(updateMatch);
      return () => mediaQuery.removeListener(updateMatch);
    }
  }, [breakpoint]);

  return isMobile;
}
