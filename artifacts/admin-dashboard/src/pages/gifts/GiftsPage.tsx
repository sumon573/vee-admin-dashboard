import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { ref, get, set, remove, push } from 'firebase/database';
import { rtdb as database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GiftItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  animation?: string;
  isActive?: boolean;
}

async function getGifts(): Promise<GiftItem[]> {
  try {
    const snapshot = await get(ref(database, 'gifts_catalog'));
    if (!snapshot.exists()) return [];
    const gifts: GiftItem[] = [];
    snapshot.forEach((child) => {
      gifts.push({ id: child.key!, ...child.val() });
    });
    return gifts.sort((a, b) => a.price - b.price);
  } catch {
    return [];
  }
}

export default function GiftsPage() {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; gift?: GiftItem }>({ open: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', imageUrl: '', category: '' });
  
  const queryClient = useQueryClient();
  
  const { data: gifts, isLoading } = useQuery({
    queryKey: ['gifts-catalog'],
    queryFn: getGifts,
    staleTime: 60 * 1000,
  });
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        price: parseInt(form.price),
        imageUrl: form.imageUrl || null,
        category: form.category || 'general',
        isActive: true,
        updatedAt: Date.now(),
      };
      if (dialog.gift) {
        await set(ref(database, `gifts_catalog/${dialog.gift.id}`), data);
      } else {
        await push(ref(database, 'gifts_catalog'), { ...data, createdAt: Date.now() });
      }
    },
    onSuccess: () => {
      toast.success(dialog.gift ? 'Gift updated' : 'Gift added');
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
      setDialog({ open: false });
      setForm({ name: '', price: '', imageUrl: '', category: '' });
    },
    onError: () => toast.error('Failed to save gift'),
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove(ref(database, `gifts_catalog/${id}`)),
    onSuccess: () => {
      toast.success('Gift deleted');
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete gift'),
  });
  
  const openEdit = (gift?: GiftItem) => {
    if (gift) {
      setForm({ name: gift.name, price: String(gift.price), imageUrl: gift.imageUrl || '', category: gift.category || '' });
    } else {
      setForm({ name: '', price: '', imageUrl: '', category: '' });
    }
    setDialog({ open: true, gift });
  };
  
  const filtered = (gifts || []).filter(g => {
    if (!search) return true;
    const s = search.toLowerCase();
    return g.name.toLowerCase().includes(s) || g.category?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8" /> Gift Catalog
          </h1>
          <p className="text-muted-foreground mt-1">Manage gifts available in voice rooms</p>
        </div>
        <Button onClick={() => openEdit()}><Plus className="h-4 w-4 mr-1" /> Add Gift</Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search gifts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No gifts found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((gift) => (
                <Card key={gift.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {gift.imageUrl ? (
                      <img src={gift.imageUrl} alt={gift.name} className="w-full h-full object-cover" />
                    ) : (
                      <Gift className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="font-medium">{gift.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary">{gift.price} 💎</Badge>
                      {gift.category && <Badge variant="outline">{gift.category}</Badge>}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(gift)} className="flex-1">
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(gift.id)} className="flex-1 text-red-600">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.gift ? 'Edit Gift' : 'Add Gift'}</DialogTitle>
            <DialogDescription>Configure gift details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gift name" /></div>
            <div><label className="text-sm font-medium">Price (diamonds)</label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="100" /></div>
            <div><label className="text-sm font-medium">Image URL</label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></div>
            <div><label className="text-sm font-medium">Category</label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="general" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.price || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gift?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the gift from the catalog. Users won't be able to send it anymore.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
