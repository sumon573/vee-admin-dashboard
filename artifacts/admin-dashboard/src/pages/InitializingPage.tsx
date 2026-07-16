import {
  CheckCircle,
  Database,
  Flame,
  LayoutDashboard,
  Shield,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/config/constants';

const STACK_ITEMS = [
  { icon: Zap, label: 'React 19 + Vite', status: 'Ready' },
  { icon: Shield, label: 'TypeScript', status: 'Ready' },
  { icon: LayoutDashboard, label: 'Tailwind CSS + shadcn/ui', status: 'Ready' },
  { icon: Database, label: 'TanStack Query v5', status: 'Ready' },
  { icon: Flame, label: 'Firebase SDK v11', status: 'Configure' },
];

/**
 * Placeholder page shown on the root route until business pages are added.
 * Replace this with your actual dashboard or redirect to a real page.
 */
export default function InitializingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Hero */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h1 className="text-xl font-semibold">Project initialized</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {APP_NAME} scaffold is running. Start building your features inside{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            src/features/
          </code>
          .
        </p>
      </div>

      {/* Stack status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STACK_ITEMS.map(({ icon: Icon, label, status }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{label}</span>
              </div>
              <Badge
                variant={status === 'Ready' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Next steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Next steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              Add Firebase credentials to{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                .env
              </code>{' '}
              (see{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                .env.example
              </code>
              )
            </li>
            <li>
              Create feature modules under{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                src/features/
              </code>
            </li>
            <li>
              Add routes in{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                src/routes/index.tsx
              </code>
            </li>
            <li>Add navigation items in the Sidebar component</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
