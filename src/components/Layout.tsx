import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isNurbsPage = location.pathname === '/nurbs';

  if (isHomePage || isNurbsPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Wind Turbine</h1>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                3D Visualization Demo
              </span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex justify-between items-center py-3">
            <nav className="flex gap-1">
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === '/'
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Home</span>
              </Link>
              <Link
                to="/nurbs"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === '/nurbs'
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>NURBS</span>
              </Link>
              <a href="#" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                <span>Settings</span>
              </a>
            </nav>

            <div className="flex gap-3 items-center">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                <span>Search</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                <span>Create New</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-[1400px] mx-auto px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative text-center py-8 border-t border-border mt-12">
        <p className="text-sm text-muted-foreground">
          Built with React, shadcn/ui, and Three.js
        </p>
      </footer>
    </div>
  );
}
