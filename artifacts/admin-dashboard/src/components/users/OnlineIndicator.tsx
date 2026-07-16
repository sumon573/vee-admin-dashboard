import { cn } from '@/lib/utils';

export function OnlineIndicator({ online, className }: { online: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", online ? "bg-green-500" : "bg-slate-500")} />
      <span className="text-sm text-muted-foreground">{online ? 'Online' : 'Offline'}</span>
    </div>
  );
}