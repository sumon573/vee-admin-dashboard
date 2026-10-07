import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Wallet, Search, ArrowUpRight, ArrowDownLeft, Gift, 
  TrendingUp, Users, DollarSign 
} from 'lucide-react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb as database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/utils';
import { format } from 'date-fns';

interface WalletTransaction {
  id: string;
  uid: string;
  userName?: string;
  type: 'add' | 'remove' | 'gift_sent' | 'gift_received' | 'purchase';
  amount: number;
  timestamp: number;
  description?: string;
  giftId?: string;
  giftName?: string;
}

async function getWalletTransactions(limit = 100): Promise<WalletTransaction[]> {
  try {
    const txRef = query(
      ref(database, 'wallet_transactions'),
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    const snapshot = await get(txRef);
    if (!snapshot.exists()) return [];
    
    const transactions: WalletTransaction[] = [];
    snapshot.forEach((child) => {
      transactions.push({ id: child.key!, ...child.val() });
    });
    return transactions.reverse();
  } catch {
    return [];
  }
}

async function getWalletStats() {
  try {
    const [usersSnap, txSnap] = await Promise.all([
      get(ref(database, 'users')),
      get(query(ref(database, 'wallet_transactions'), limitToLast(1000))),
    ]);
    
    let totalDiamonds = 0;
    let userCount = 0;
    if (usersSnap.exists()) {
      usersSnap.forEach((child) => {
        const user = child.val();
        if (user.diamonds) totalDiamonds += user.diamonds;
        userCount++;
      });
    }
    
    let totalVolume = 0;
    let giftCount = 0;
    if (txSnap.exists()) {
      txSnap.forEach((child) => {
        const tx = child.val();
        if (tx.amount) totalVolume += Math.abs(tx.amount);
        if (tx.type === 'gift_sent') giftCount++;
      });
    }
    
    return { totalDiamonds, userCount, totalVolume, giftCount };
  } catch {
    return { totalDiamonds: 0, userCount: 0, totalVolume: 0, giftCount: 0 };
  }
}

export default function WalletPage() {
  const [search, setSearch] = useState('');
  
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => getWalletTransactions(100),
    staleTime: 30 * 1000,
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['wallet-stats'],
    queryFn: getWalletStats,
    staleTime: 60 * 1000,
  });
  
  const filtered = (transactions || []).filter(tx => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      tx.uid?.toLowerCase().includes(s) ||
      tx.userName?.toLowerCase().includes(s) ||
      tx.description?.toLowerCase().includes(s) ||
      tx.giftName?.toLowerCase().includes(s)
    );
  });
  
  const typeBadge: Record<string, string> = {
    add: 'bg-green-100 text-green-800',
    remove: 'bg-red-100 text-red-800',
    gift_sent: 'bg-purple-100 text-purple-800',
    gift_received: 'bg-blue-100 text-blue-800',
    purchase: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8" /> Wallet Management
        </h1>
        <p className="text-muted-foreground mt-1">Monitor diamonds, transactions, and gift economy</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Diamonds</CardTitle></CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />{formatNumber(stats?.totalDiamonds || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />{formatNumber(stats?.userCount || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transaction Volume</CardTitle></CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />{formatNumber(stats?.totalVolume || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gifts Sent</CardTitle></CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />{formatNumber(stats?.giftCount || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by UID, username, or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {tx.type === 'add' ? <ArrowDownLeft className="h-4 w-4 text-green-500" /> :
                     tx.type === 'remove' ? <ArrowUpRight className="h-4 w-4 text-red-500" /> :
                     <Gift className="h-4 w-4 text-purple-500" />}
                    <div>
                      <div className="font-medium">{tx.userName || tx.uid?.substring(0, 8) + '...'}</div>
                      <div className="text-sm text-muted-foreground">
                        {tx.description || tx.giftName || tx.type}
                        {tx.timestamp && <span className="ml-2">{format(new Date(tx.timestamp), 'MMM d, HH:mm')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={typeBadge[tx.type] || 'bg-gray-100 text-gray-800'}>{tx.type.replace('_', ' ')}</Badge>
                    <span className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
