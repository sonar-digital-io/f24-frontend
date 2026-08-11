import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Thin wrapper around the routed page. Each page is responsible for rendering
 * its own MainNav + Footer (see `pages/Home.tsx`, `components/PagePlaceholder.tsx`).
 * The Nurbs page intentionally renders fullscreen with no nav/footer.
 */
export function Layout({ children }: LayoutProps) {
  return <>{children}</>;
}
