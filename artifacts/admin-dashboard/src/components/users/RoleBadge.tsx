import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'superAdmin') return <Badge className="bg-purple-600 hover:bg-purple-700">Super Admin</Badge>;
  if (role === 'admin') return <Badge className="bg-blue-600 hover:bg-blue-700">Admin</Badge>;
  if (role === 'moderator') return <Badge className="bg-amber-600 hover:bg-amber-700">Moderator</Badge>;
  return <Badge className="bg-slate-600 hover:bg-slate-700">User</Badge>;
}