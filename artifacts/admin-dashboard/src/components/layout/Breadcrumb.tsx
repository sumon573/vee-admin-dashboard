import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

const routeMap: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/reports': 'Reports',
  '/rooms': 'Voice Rooms',
  '/moderation': 'Moderation Log',
};

export default function BreadcrumbNav() {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);

  let crumbs = [];

  if (paths.length === 0) {
    crumbs.push({ label: 'Dashboard', path: '/' });
  } else {
    // Reconstruct paths
    let currentPath = '';
    paths.forEach((p, idx) => {
      currentPath += `/${p}`;
      if (idx === 0 && currentPath === '/users' && paths.length > 1) {
         crumbs.push({ label: 'Users', path: currentPath });
      } else if (idx === 1 && paths[0] === 'users') {
         crumbs.push({ label: 'Profile', path: currentPath });
      } else {
         crumbs.push({ label: routeMap[currentPath] || p, path: currentPath });
      }
    });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <Fragment key={crumb.path}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}