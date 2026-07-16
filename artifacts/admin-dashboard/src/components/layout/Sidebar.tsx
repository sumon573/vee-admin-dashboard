import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Users2,
  Flag,
  Radio,
  ScrollText,
  LogOut
} from 'lucide-react';
import { useAppAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/users/RoleBadge';
import { getInitials } from '@/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Users', href: '/users', icon: Users2 },
  { label: 'Reports', href: '/reports', icon: Flag },
  { label: 'Voice Rooms', href: '/rooms', icon: Radio },
  { label: 'Mod Log', href: '/moderation', icon: ScrollText },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { appUser, signOut } = useAppAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      <div className="h-16 flex items-center px-6 gap-3 border-b border-border">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <span className="text-xl font-bold text-foreground">AdminPanel</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Separator className="bg-border" />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src={appUser?.photoURL} />
            <AvatarFallback>{appUser ? getInitials(appUser.name) : 'A'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{appUser?.name}</p>
            {appUser && <RoleBadge role={appUser.role} />}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}