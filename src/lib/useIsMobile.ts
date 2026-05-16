import { useEffect, useState } from 'react';

const QUERY = '(max-width: 640px)';

/** True when the viewport is narrow enough that we should swap to a
 * full-screen, touch-first layout. Listens to matchMedia changes. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return mobile;
}
