import { Link, useLocation } from 'react-router-dom';
import { Settings, CircleUser } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Material', path: '/material' },
  { label: 'Geometry', path: '/geometry' },
  { label: 'Layup', path: '/layup' },
  { label: 'Composition', path: '/composition' },
  { label: 'Load group', path: '/load-group' },
  { label: 'Calculation', path: '/calculation' },
  { label: 'Report', path: '/report' },
];

function isActivePath(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

export function MainNav() {
  const location = useLocation();

  return (
    <div className="sticky top-0 z-50">
      {/* Gradient bar */}
      <div className="h-[13px] w-full shrink-0 bg-gradient-to-r from-[#fc0] via-[#72b84c] via-50% to-[#007dbb]" />

      {/* Top navigation */}
      <nav className="flex h-14 w-full shrink-0 items-center justify-between bg-white pr-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex h-14 items-center px-4 font-bold text-[20px] leading-7 text-[#181c20]"
          >
            F24 logo
          </Link>

          {/* Nav items */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(location.pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium leading-5 transition-colors ${
                    active
                      ? 'bg-[#eef9ff] text-[#171717]'
                      : 'text-[#0a0a0a] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side: settings + user */}
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            aria-label="Settings"
            aria-current={isActivePath(location.pathname, '/settings') ? 'page' : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              isActivePath(location.pathname, '/settings')
                ? 'bg-[#eef9ff] text-[#171717]'
                : 'text-[#181c20] hover:bg-[#f1f5f9]'
            }`}
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </Link>
          <button
            aria-label="User menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#181c20] hover:bg-[#f1f5f9]"
          >
            <CircleUser className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </nav>
    </div>
  );
}
