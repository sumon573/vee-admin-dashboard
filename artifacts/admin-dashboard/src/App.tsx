import { Providers } from '@/app/providers';
import { AppRoutes } from '@/routes';

/**
 * Application root.
 *
 * Wraps the entire app in global providers and renders the route tree.
 * Avoid putting any UI or business logic here – keep it minimal.
 */
export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
