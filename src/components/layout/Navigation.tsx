import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Status Board', to: '/board' },
  { label: 'Profile', to: '/profile' },
  { label: 'Help', to: '/help' },
  { label: 'About', to: '/about' },
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-ink-800 text-gold'
      : 'text-ash-200 hover:bg-ink-800 hover:text-gold-bright',
  ].join(' ');

export function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 md:flex-row md:gap-2">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={linkClasses} onClick={onNavigate} end={item.to === '/'}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
