import { useState } from 'react';
import { format } from 'date-fns';
import { Flag, Search, User, FileText } from 'lucide-react';
import { useReports, useResolveReport, useDismissReport } from '@/hooks';
import type { ReportStatus, Report } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportStatus>('pending');
  const { data: reports, isLoading } = useReports(activeTab);

  const resolveMutation = useResolveReport();
  const dismissMutation = useDismissReport();

  const [actionDialog, setActionDialog] = useState<{ report: Report, action: 'resolve'|'dismiss', note: string } | null>(null);

  const handleAction = () => {
    if (!actionDialog) return;
    const { report, action, note } = actionDialog;
    if (action === 'resolve') {
      resolveMutation.mutate({ reportId: report.id, note });
    } else {
      dismissMutation.mutate({ reportId: report.id, note });
    }
    setActionDialog(null);
  };

  const renderTable = (status: ReportStatus) => {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Report ID</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Time</TableHead>
              {status !== 'pending' && <TableHead>Moderator</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-border">
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-24" /></div></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                {status !== 'pending' && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (!reports || reports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Flag className="w-12 h-12 mb-4 opacity-20" />
          <p>No {status} reports found</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead>Report ID</TableHead>
            <TableHead>Users</TableHead>
            <TableHead className="w-1/3">Reason</TableHead>
            <TableHead>Time</TableHead>
            {status !== 'pending' && <TableHead>Moderator Info</TableHead>}
            {status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id} className="border-border transition-colors">
              <TableCell className="font-mono text-xs text-muted-foreground">
                {report.id.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-destructive" />
                    <span className="font-mono truncate w-24" title={report.reportedUid}>{report.reportedUid}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Search className="w-3 h-3" />
                    <span className="font-mono truncate w-24" title={report.reportedByUid}>{report.reportedByUid}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-secondary">
                    {report.status}
                  </Badge>
                  <span className="text-sm font-medium">{report.reason}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {report.timestamp ? format(new Date(report.timestamp), 'MMM d, HH:mm') : 'Unknown'}
              </TableCell>
              
              {status !== 'pending' && (
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">By: {report.resolvedBy || 'Unknown'}</span>
                    {report.moderatorNote && (
                      <div className="flex items-start gap-1 mt-1 text-foreground">
                        <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="truncate max-w-[150px]" title={report.moderatorNote}>
                          {report.moderatorNote}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
              )}

              {status === 'pending' && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                      onClick={() => setActionDialog({ report, action: 'resolve', note: '' })}
                    >
                      Resolve
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActionDialog({ report, action: 'dismiss', note: '' })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Report Management</h2>
        <p className="text-muted-foreground">Review and moderate user-submitted reports</p>
      </div>

      <Card className="border-border">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportStatus)} className="w-full">
          <div className="border-b border-border px-4 py-2 bg-sidebar/50 rounded-t-xl">
            <TabsList className="bg-background border border-border">
              <TabsTrigger value="pending" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                Pending
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="pending" className="m-0 border-0">
            {renderTable('pending')}
          </TabsContent>
          <TabsContent value="resolved" className="m-0 border-0">
            {renderTable('resolved')}
          </TabsContent>
          <TabsContent value="dismissed" className="m-0 border-0">
            {renderTable('dismissed')}
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{actionDialog?.action === 'resolve' ? 'Resolve' : 'Dismiss'} Report</DialogTitle>
            <DialogDescription>
              Add an optional note about why this report is being {actionDialog?.action}d.
            </DialogDescription>
          </DialogHeader>
          {actionDialog && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-sidebar rounded-md border border-border text-sm">
                <span className="font-medium">Reason: </span>
                {actionDialog.report.reason}
              </div>
              <Textarea 
                placeholder="Moderator note (optional)..."
                value={actionDialog.note}
                onChange={(e) => setActionDialog({ ...actionDialog, note: e.target.value })}
                className="bg-background min-h-[100px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button 
              onClick={handleAction}
              className={actionDialog?.action === 'resolve' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
            >
              {actionDialog?.action === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}