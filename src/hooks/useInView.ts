import { useEffect, useRef, useState } from 'react';

/**
 * True once the returned ref's element has entered the viewport — stays true
 * afterwards (doesn't flip back out). Used to defer per-card network fetches
 * (e.g. grid thumbnails) until the card is actually scrolled into view,
 * instead of firing them all at once for every row on mount.
 */
export function useInView<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}
