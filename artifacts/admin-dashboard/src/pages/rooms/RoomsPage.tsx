import { useState } from 'react';
import { useAllRooms, useCloseRoom, useKickUser, useLockSeat, useUnlockSeat } from '@/hooks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { format } from 'date-fns';
import { Radio, Lock, Unlock, UserX, XCircle } from 'lucide-react';
import type { Room } from '@/types';

export default function RoomsPage() {
  const { data: rooms, isLoading } = useAllRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToClose, setRoomToClose] = useState<Room | null>(null);

  const closeRoom = useCloseRoom();
  const kickUser = useKickUser();
  const lockSeat = useLockSeat();
  const unlockSeat = useUnlockSeat();

  const [kickingUser, setKickingUser] = useState<{ uid: string; roomId: string } | null>(null);

  const activeRooms = rooms?.filter(r => r.active) || [];
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Voice Rooms</h2>
          <p className="text-muted-foreground">Manage active and historical voice rooms</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {activeRooms.length} Active Now
        </Badge>
      </div>

      <Card className="border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Room Name</TableHead>
              <TableHead>Owner ID</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <TableRow key={room.id} className="border-border transition-colors">
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                    {room.ownerId}
                  </TableCell>
                  <TableCell>{Object.keys(room.members ?? {}).length}</TableCell>
                  <TableCell>
                    {room.active ? (
                      <Badge className="bg-green-500 hover:bg-green-600 text-green-950">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {room.createdAt ? format(new Date(room.createdAt), 'MMM d, yyyy') : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRoom(room)}>
                        Details
                      </Button>
                      {room.active && (
                        <Button variant="destructive" size="sm" onClick={() => setRoomToClose(room)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Radio className="w-8 h-8 opacity-20" />
                    <p>No rooms found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Room Details: {selectedRoom?.name}</DialogTitle>
            <DialogDescription>
              Owner: <span className="font-mono text-xs">{selectedRoom?.ownerId}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Seats</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedRoom.seats?.map((seat) => (
                    <Card key={seat.index} className="p-3 border-border bg-sidebar text-center flex flex-col items-center gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Seat {seat.index}</div>
                      {seat.locked ? (
                        <Lock className="w-5 h-5 text-destructive" />
                      ) : seat.uid ? (
                        <div className="font-mono text-[10px] text-primary truncate w-full" title={seat.uid}>
                          {seat.uid.slice(0, 6)}...
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Empty</div>
                      )}
                      
                      <div className="mt-2 flex gap-1 justify-center w-full">
                        {seat.locked ? (
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => unlockSeat.mutate({ roomId: selectedRoom.id, seatIndex: seat.index })}
                          >
                            <Unlock className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => lockSeat.mutate({ roomId: selectedRoom.id, seatIndex: seat.index })}
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        )}
                        {seat.uid && (
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setKickingUser({ uid: seat.uid!, roomId: selectedRoom.id })}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  {!selectedRoom.seats?.length && (
                    <div className="col-span-full text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                      No seats configured for this room
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Members ({Object.keys(selectedRoom.members ?? {}).length})</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {Object.keys(selectedRoom.members ?? {}).map((uid) => (
                    <div key={uid} className="flex justify-between items-center p-2 rounded-md bg-sidebar border border-border">
                      <span className="font-mono text-xs">{uid}</span>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => setKickingUser({ uid, roomId: selectedRoom.id })}
                      >
                        Kick
                      </Button>
                    </div>
                  ))}
                  {Object.keys(selectedRoom.members ?? {}).length === 0 && (
                    <div className="text-sm text-muted-foreground italic">No members</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roomToClose} onOpenChange={(open) => !open && setRoomToClose(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Close Room?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to forcibly close the room "{roomToClose?.name}"? 
              All users will be disconnected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (roomToClose) {
                  closeRoom.mutate({ roomId: roomToClose.id, roomName: roomToClose.name });
                  setRoomToClose(null);
                }
              }}
            >
              Close Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!kickingUser} onOpenChange={(open) => !open && setKickingUser(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Kick User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to kick user <span className="font-mono text-xs">{kickingUser?.uid}</span> from the room?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (kickingUser) {
                  kickUser.mutate({ 
                    roomId: kickingUser.roomId, 
                    uid: kickingUser.uid, 
                    targetName: 'User' // Need name if available, fallback to 'User'
                  });
                  setKickingUser(null);
                }
              }}
            >
              Kick User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}