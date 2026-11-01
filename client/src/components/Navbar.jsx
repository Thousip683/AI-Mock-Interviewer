import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk, Show } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Menu, X, LayoutDashboard, PlusCircle, Sparkles, 
  BarChart3, LogOut, User, ChevronDown, GraduationCap 
} from 'lucide-react';

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/create-interview', label: 'New Interview', icon: PlusCircle },
  { path: '/feedback', label: 'Feedback', icon: BarChart3 },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const [authError, setAuthError] = useState('');
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); setDropdownOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') { setDropdownOpen(false); setMobileOpen(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const logOut = async () => {
    setAuthError('');
    try { await signOut({ redirectUrl: '/' }); }
    catch { setAuthError('Sign out failed. Please try again.'); }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-300" />
            <div className="relative flex items-center justify-center w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            MockAI
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <Show when="signed-in">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </Show>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild><Link to="/login">Sign In</Link></Button>
              <Button variant="gradient" size="sm" asChild><Link to="/sign-up">Get Started</Link></Button>
            </div>
          </Show>

          <Show when="signed-in">
            {/* User Dropdown */}
            <div className="relative">
              <button
                aria-label="Account menu" aria-expanded={dropdownOpen} aria-controls="account-menu"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div id="account-menu" className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border bg-popover p-1 shadow-lg animate-in slide-in-from-top-2">
                    <div className="px-2 py-1.5 mb-1">
                      <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.emailAddresses?.[0]?.emailAddress}
                      </p>
                    </div>
                    <Separator />
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={logOut}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </Show>

          {/* Mobile menu button */}
          <button
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation"
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {authError && <p role="alert" className="container py-2 text-sm text-destructive">{authError}</p>}
      {/* Mobile Nav */}
      {mobileOpen && (
        <div id="mobile-navigation" className="md:hidden border-t bg-background animate-in slide-in-from-top-2">
          <div className="container py-4 space-y-1">
            <Show when="signed-out"><Link to="/login" className="block rounded-lg px-3 py-2.5">Sign In</Link><Link to="/sign-up" className="block rounded-lg px-3 py-2.5">Create account</Link></Show>
            <Show when="signed-in">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </Show>
          </div>
        </div>
      )}
    </nav>
  );
}

function Separator() {
  return <div className="h-px bg-border my-1" />;
}

