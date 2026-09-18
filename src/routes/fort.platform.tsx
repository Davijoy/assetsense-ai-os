import { createFileRoute } from "@tanstack/react-router";
import { FORTS } from "@/sentinel/forts";
import { FortDashboard } from "@/components/sentinel/FortDashboard";
import type { FortWorkspaceContext } from "@/lib/fort-workspace.functions";
import type { FortPageUser } from "@/components/sentinel/FortPage";

export const Route = createFileRoute("/fort/platform")({
  component: PlatformFort,
});

function PlatformFort() {
  const { user, fort: workspace } = Route.useRouteContext() as {
    user: FortPageUser;
    fort: FortWorkspaceContext;
  };

  const fort = FORTS.PLATFORM;

  return (
    <FortDashboard
      fort={fort}
      roles={user.roles}
      workspace={workspace}
    />
  );
}
