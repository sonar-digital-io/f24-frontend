import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, CircleUser } from 'lucide-react';

const navItems = [
  { label: 'Home', path: '/', hasDropdown: false },
  { label: 'Material', path: '/material', hasDropdown: true },
  { label: 'Geometry', path: '/geometry', hasDropdown: true },
  { label: 'Layup', path: '/layup', hasDropdown: true },
  { label: 'Composition', path: '/composition', hasDropdown: false },
  { label: 'Calculation', path: '/calculation', hasDropdown: false },
  { label: 'Report', path: '/report', hasDropdown: false },
  { label: 'Settings', path: '/settings', hasDropdown: false },
];

interface TopNavProps {
  activeItem?: string;
}

export function TopNav({ activeItem = 'composition' }: TopNavProps) {
  const location = useLocation();

  return (
    <nav className="flex h-14 items-center bg-white shadow-sm border-b border-border px-4">
      {/* Logo */}
      <Link to="/" className="flex items-center h-14 px-4 shrink-0">
        <span className="text-xl font-bold text-foreground">F24</span>
      </Link>

      {/* Nav Items */}
      <div className="flex items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            activeItem === item.label.toLowerCase() ||
            location.pathname === item.path;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-1.5 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {item.label}
              {item.hasDropdown && (
                <ChevronDown className="w-3 h-3 opacity-60" />
              )}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div className="flex items-center gap-2 shrink-0 px-4">
        <CircleUser className="w-6 h-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">econ9@econ.com</span>
      </div>
    </nav>
  );
}
