import { createFileRoute, redirect } from "@tanstack/react-router";
import { isRouteAuthorized } from "@/lib/route-roles";
import { BrandStudioShell } from "@/components/brand/studio/BrandStudioShell";

export const Route = createFileRoute("/app/settings/branding")({
  head: () => ({ meta: [{ title: "Brand & Experience Studio — Sentinel Fort Group" }] }),
  beforeLoad: async ({ context, location }) => {
    const fort = (context as any)?.fort;
    const roles = (context as any)?.user?.roles ?? fort?.role?.appRoles ?? [];
    const featureFlags = fort?.featureFlags;
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname, featureFlags)) {
      throw redirect({ to: "/fort" });
    }
  },
  component: BrandStudioPage,
});

function BrandStudioPage() {
  return <BrandStudioShell />;
}