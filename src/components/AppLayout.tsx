import { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    label: 'Calculateur',
    href: '/calculateur',
    icon: Calculator,
  },
  {
    label: 'Soumissions',
    href: '/soumissions',
    icon: FileText,
  },
  {
    label: 'Administration',
    href: '/admin',
    icon: Settings,
  },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname.startsWith('/admin');
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-7 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(var(--sidebar-primary))' }}>
            <div className="w-4 h-4 rounded-sm bg-white opacity-90" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
              Octogone
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'hsl(var(--sidebar-primary))' }}>
              360
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'hsl(var(--sidebar-foreground) / 0.4)' }}>
          Menu principal
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'shadow-sm'
                  : 'hover:opacity-90'
              )}
              style={active ? {
                background: 'hsl(var(--sidebar-primary) / 0.2)',
                color: 'hsl(var(--sidebar-primary))',
                border: '1px solid hsl(var(--sidebar-primary) / 0.3)',
              } : {
                color: 'hsl(var(--sidebar-foreground) / 0.75)',
              }}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Déconnexion */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-150 hover:opacity-80"
          style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0"
        style={{ background: 'hsl(var(--sidebar-background))' }}>
        <SidebarContent />
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 h-full shadow-xl"
            style={{ background: 'hsl(var(--sidebar-background))' }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4"
              style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'hsl(var(--primary))' }}>
              <div className="w-3 h-3 rounded-sm bg-white opacity-90" />
            </div>
            <span className="font-bold text-sm">Octogone 360</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
