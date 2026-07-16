import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/config/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root provider tree — order matters.
 *
 * 1. BrowserRouter      — must be outermost for any router hook to work
 * 2. QueryClientProvider — TanStack Query context
 * 3. AuthProvider        — Firebase auth + RTDB profile; uses QueryClient internally
 * 4. TooltipProvider     — Radix tooltip context
 * 5. Toaster             — Sonner toast root
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
