import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, Copy, Check, Gem, DollarSign, Users, 
  UserPlus, UserCheck, Radio, AlertTriangle
} from 'lucide-react';
import { 
  useUser, useBanUser, useUnbanUser, useChangeRole, 
  useAddDiamonds, useRemoveDiamonds 
} from '@/hooks';
import { getInitials, formatNumber } from '@/utils';
import { RoleBadge } from '@/components/users/RoleBadge';
import { OnlineIndicator } from '@/components/users/OnlineIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(uid);

  const [copiedUid, setCopiedUid] = useState(false);
  
  // Dialog states
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [roleDialog, setRoleDialog] = useState<{ open: boolean, role: string }>({ open: false, role: '' });
  const [diamondDialog, setDiamondDialog] = useState<{ open: boolean, action: 'add'|'remove', amount: string }>({ open: false, action: 'add', amount: '' });

  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const roleMutation = useChangeRole();
  const addDiamondsMutation = useAddDiamonds();
  const removeDiamondsMutation = useRemoveDiamonds();

  const handleCopy = () => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleBanToggle = () => {
    if (!user) return;
    if (user.banned) {
      unbanMutation.mutate({ uid: user.uid, targetName: user.name });
    } else {
      banMutation.mutate({ uid: user.uid, targetName: user.name });
    }
    setShowBanConfirm(false);
  };

  const handleRoleChange = () => {
    if (!user) return;
    roleMutation.mutate({ uid: user.uid, newRole: roleDialog.role, targetName: user.name });
    setRoleDialog({ open: false, role: '' });
  };

  const handleDiamondChange = () => {
    if (!user) return;
    const amount = parseInt(diamondDialog.amount, 10);
    if (isNaN(amount) || amount <= 0) return;

    if (diamondDialog.action === 'add') {
      addDiamondsMutation.mutate({ 
        uid: user.uid, amount, currentDiamonds: user.diamonds, targetName: user.name 
      });
    } else {
      removeDiamondsMutation.mutate({ 
        uid: user.uid, amount, currentDiamonds: user.diamonds, targetName: user.name 
      });
    }
    setDiamondDialog({ open: false, action: 'add', amount: '' });
  };

  if (!isLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-6">The user you are looking for does not exist or has been deleted.</p>
        <Button asChild><Link to="/users">Back to Users</Link></Button>
      </div>
    );
  }

  const friendsCount = Object.keys(user?.friends ?? {}).length;
  const followersCount = Object.keys(user?.followers ?? {}).length;
  const followingCount = Object.keys(user?.following ?? {}).length;
  const roomsJoinedCount = Object.keys(user?.roomsJoined ?? {}).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" asChild className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
        <Link to="/users" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity */}
        <Card className="lg:col-span-1 border-border bg-card">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="w-full space-y-3 mt-6">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ) : user && (
              <div className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-lg">
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-2xl font-bold text-center mb-2">{user.name}</h2>
                <div className="flex items-center gap-2 mb-6">
                  <RoleBadge role={user.role} />
                  {user.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <OnlineIndicator online={user.online} />
                  )}
                </div>

                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground text-sm">UID</span>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={handleCopy}>
                      <span className="font-mono text-sm">{user.uid.slice(0, 16)}...</span>
                      {copiedUid ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-50 group-hover:opacity-100" />}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground text-sm">Email</span>
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  {user.vId && (
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground text-sm">Vanity ID</span>
                      <span className="text-sm font-medium">{user.vId}</span>
                    </div>
                  )}
                  {user.country && (
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground text-sm">Country</span>
                      <span className="text-sm font-medium">{user.country}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground text-sm">Joined</span>
                    <span className="text-sm font-medium">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'Unknown'}
                    </span>
                  </div>
                </div>

                {user.bio && (
                  <div className="w-full mt-6 p-4 bg-sidebar rounded-md border border-border">
                    <p className="text-sm text-muted-foreground italic">"{user.bio}"</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Stats & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Gem className="w-6 h-6 text-blue-400 mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Diamonds</span>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <span className="text-2xl font-bold">{formatNumber(user?.diamonds || 0)}</span>}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <DollarSign className="w-6 h-6 text-green-400 mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Wallet</span>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <span className="text-2xl font-bold">${formatNumber(user?.wallet || 0)}</span>}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Users className="w-6 h-6 text-purple-400 mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Friends</span>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <span className="text-2xl font-bold">{formatNumber(friendsCount)}</span>}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <UserCheck className="w-6 h-6 text-amber-400 mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Followers</span>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <span className="text-2xl font-bold">{formatNumber(followersCount)}</span>}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <UserPlus className="w-6 h-6 text-rose-400 mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Following</span>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <span className="text-2xl font-bold">{formatNumber(followingCount)}</span>}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Radio className="w-6 h-6 text-cyan-400 mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Rooms Joined</span>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <span className="text-2xl font-bold">{formatNumber(roomsJoinedCount)}</span>}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Administrative Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    variant={user.banned ? "default" : "destructive"} 
                    className={user.banned ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setShowBanConfirm(true)}
                  >
                    {user.banned ? "Unban User" : "Ban User"}
                  </Button>
                  
                  <Button variant="outline" onClick={() => setRoleDialog({ open: true, role: user.role })}>
                    Change Role
                  </Button>
                  
                  <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => setDiamondDialog({ open: true, action: 'add', amount: '' })}>
                    Add Diamonds
                  </Button>
                  
                  <Button variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" onClick={() => setDiamondDialog({ open: true, action: 'remove', amount: '' })}>
                    Remove Diamonds
                  </Button>

                  <Button variant="secondary" className="sm:col-span-2" asChild>
                    <Link to="/reports">View User Reports</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showBanConfirm} onOpenChange={setShowBanConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{user?.banned ? 'Unban' : 'Ban'} {user?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {user?.banned ? 'unban' : 'ban'} this user?
              {!user?.banned && " This will restrict their access to the application immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={user?.banned ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90"}
              onClick={handleBanToggle}
            >
              {user?.banned ? 'Unban User' : 'Ban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={roleDialog.open} onOpenChange={(o) => !o && setRoleDialog({ open: false, role: '' })}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Update role for {user?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={roleDialog.role} onValueChange={(val) => setRoleDialog({ ...roleDialog, role: val })}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, role: '' })}>Cancel</Button>
            <Button onClick={handleRoleChange}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={diamondDialog.open} onOpenChange={(o) => !o && setDiamondDialog({ open: false, action: 'add', amount: '' })}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{diamondDialog.action === 'add' ? 'Add' : 'Remove'} Diamonds</DialogTitle>
            <DialogDescription>
              Adjust diamond balance for {user?.name}.
              Current balance: {formatNumber(user?.diamonds || 0)}
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiamondDialog({ open: false, action: 'add', amount: '' })}>Cancel</Button>
            <Button 
              onClick={handleDiamondChange}
              variant={diamondDialog.action === 'add' ? 'default' : 'destructive'}
            >
              {diamondDialog.action === 'add' ? 'Add Diamonds' : 'Remove Diamonds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}