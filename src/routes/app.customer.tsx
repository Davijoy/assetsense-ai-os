import { createFileRoute, redirect } from '@tanstack/react-router'
import { isRouteAuthorized } from '@/lib/route-roles'

export const Route = createFileRoute('/app/customer')({
  beforeLoad: async ({ context, location }) => {
    const fort = (context as any)?.fort;
    const roles = (context as any)?.user?.roles ?? fort?.role?.appRoles ?? [];
    const featureFlags = fort?.featureFlags;
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname, featureFlags)) {
      throw redirect({ to: '/fort' });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/customer"!</div>
}
