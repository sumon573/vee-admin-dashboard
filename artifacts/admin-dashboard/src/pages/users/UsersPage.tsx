import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Users2, 
  Search, 
  MoreHorizontal, 
  Copy, 
  Check, 
  Gem,
  DollarSign
} from 'lucide-react';
import { useUsers, useBanUser, useUnbanUser, useChangeRole, useAddDiamonds, useRemoveDiamonds } from '@/hooks';
import type { UserFilter, UserSort, AppUser } from '@/types';
import { getInitials, formatNumber } from '@/utils';
import { RoleBadge } from '@/components/users/RoleBadge';
import { OnlineIndicator } from '@/components/users/OnlineIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [sort, setSort] = useState<UserSort>('newest');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading } = useUsers({
    search: debouncedSearch,
    filter,
    sort,
    page,
    pageSize: 15,
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  // Actions state
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [banDialog, setBanDialog] = useState<{ user: AppUser, action: 'ban' | 'unban' } | null>(null);
  const [roleDialog, setRoleDialog] = useState<{ user: AppUser, newRole: string } | null>(null);
  const [diamondDialog, setDiamondDialog] = useState<{ user: AppUser, action: 'add' | 'remove', amount: string } | null>(null);

  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const roleMutation = useChangeRole();
  const addDiamondsMutation = useAddDiamonds();
  const removeDiamondsMutation = useRemoveDiamonds();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(text);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const executeBanAction = () => {
    if (!banDialog) return;
    const { user, action } = banDialog;
    if (action === 'ban') {
      banMutation.mutate({ uid: user.uid, targetName: user.name });
    } else {
      unbanMutation.mutate({ uid: user.uid, targetName: user.name });
    }
    setBanDialog(null);
  };

  const executeRoleAction = () => {
    if (!roleDialog) return;
    roleMutation.mutate({ uid: roleDialog.user.uid, newRole: roleDialog.newRole, targetName: roleDialog.user.name });
    setRoleDialog(null);
  };

  const executeDiamondAction = () => {
    if (!diamondDialog) return;
    const amount = parseInt(diamondDialog.amount, 10);
    if (isNaN(amount) || amount <= 0) return;

    if (diamondDialog.action === 'add') {
      addDiamondsMutation.mutate({ 
        uid: diamondDialog.user.uid, 
        amount, 
        currentDiamonds: diamondDialog.user.diamonds,
        targetName: diamondDialog.user.name 
      });
    } else {
      removeDiamondsMutation.mutate({ 
        uid: diamondDialog.user.uid, 
        amount, 
        currentDiamonds: diamondDialog.user.diamonds,
        targetName: diamondDialog.user.name 
      });
    }
    setDiamondDialog(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            User Management
            <Badge variant="secondary" className="text-sm font-normal">
              {total} users
            </Badge>
          </h2>
          <p className="text-muted-foreground">View, search, and manage all users</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div className="w-full md:w-1/3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or UID..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => { setFilter(v as UserFilter); setPage(1); }} className="w-full md:w-auto overflow-x-auto">
          <TabsList className="bg-background border border-border">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="admin">Admins</TabsTrigger>
            <TabsTrigger value="moderator">Mods</TabsTrigger>
            <TabsTrigger value="banned">Banned</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full md:w-48">
          <Select value={sort} onValueChange={(v) => { setSort(v as UserSort); setPage(1); }}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="diamonds">Most Diamonds</SelectItem>
              <SelectItem value="wallet">Highest Wallet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>UID / V-ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><div className="flex gap-3 items-center"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.uid} className="border-border transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name}
                            {user.country && <span className="text-muted-foreground text-xs">({user.country})</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleCopy(user.uid)}>
                          <span className="font-mono text-xs text-muted-foreground">
                            {user.uid.slice(0, 12)}...
                          </span>
                          {copiedUid === user.uid ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        {user.vId && (
                          <span className="text-xs text-muted-foreground">ID: {user.vId}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 items-start">
                        <RoleBadge role={user.role} />
                        {user.banned ? (
                          <Badge variant="destructive" className="h-5">Banned</Badge>
                        ) : (
                          <OnlineIndicator online={user.online} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm font-medium">
                        <div className="flex items-center gap-1.5 text-blue-400">
                          <Gem className="w-3.5 h-3.5" />
                          {formatNumber(user.diamonds)}
                        </div>
                        <div className="flex items-center gap-1.5 text-green-400">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatNumber(user.wallet)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={`/users/${user.uid}`}>View Profile</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setRoleDialog({ user, newRole: user.role })}
                            className="cursor-pointer"
                          >
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDiamondDialog({ user, action: 'add', amount: '' })}
                            className="cursor-pointer"
                          >
                            Add Diamonds
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDiamondDialog({ user, action: 'remove', amount: '' })}
                            className="cursor-pointer"
                          >
                            Remove Diamonds
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.banned ? (
                            <DropdownMenuItem 
                              onClick={() => setBanDialog({ user, action: 'unban' })}
                              className="text-green-500 cursor-pointer focus:text-green-500"
                            >
                              Unban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => setBanDialog({ user, action: 'ban' })}
                              className="text-destructive cursor-pointer focus:text-destructive"
                            >
                              Ban User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users2 className="w-8 h-8 opacity-20" />
                      <p>No users found matching criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {pages > 1 && (
          <div className="border-t border-border p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} of {total} users
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pages) }).map((_, i) => {
                  let p = i + 1;
                  // Simple logic to keep current page somewhat centered if pages > 5
                  if (pages > 5 && page > 3) p = page - 3 + i;
                  if (p > pages) return null;
                  
                  return (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <AlertDialog open={!!banDialog} onOpenChange={(o) => !o && setBanDialog(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{banDialog?.action === 'ban' ? 'Ban' : 'Unban'} User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {banDialog?.action} <span className="font-medium text-foreground">{banDialog?.user.name}</span>?
              {banDialog?.action === 'ban' && " This will restrict their access to the app."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={banDialog?.action === 'ban' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700 text-white'}
              onClick={executeBanAction}
            >
              {banDialog?.action === 'ban' ? 'Ban User' : 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!roleDialog} onOpenChange={(o) => !o && setRoleDialog(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {roleDialog?.user.name}
            </DialogDescription>
          </DialogHeader>
          {roleDialog && (
            <div className="py-4">
              <Select value={roleDialog.newRole} onValueChange={(val) => setRoleDialog({ ...roleDialog, newRole: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superAdmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)}>Cancel</Button>
            <Button onClick={executeRoleAction}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!diamondDialog} onOpenChange={(o) => !o && setDiamondDialog(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{diamondDialog?.action === 'add' ? 'Add' : 'Remove'} Diamonds</DialogTitle>
            <DialogDescription>
              Adjust diamond balance for {diamondDialog?.user.name}.
              Current balance: {formatNumber(diamondDialog?.user.diamonds || 0)}
            </DialogDescription>
          </DialogHeader>
          {diamondDialog && (
            <div className="py-4">
              <Input 
                type="number" 
                placeholder="Amount" 
                value={diamondDialog.amount}
                onChange={(e) => setDiamondDialog({ ...diamondDialog, amount: e.target.value })}
                className="bg-background"
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiamondDialog(null)}>Cancel</Button>
            <Button 
              onClick={executeDiamondAction}
              variant={diamondDialog?.action === 'add' ? 'default' : 'destructive'}
            >
              {diamondDialog?.action === 'add' ? 'Add Diamonds' : 'Remove Diamonds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}