import { createFileRoute } from "@tanstack/react-router";
import { FORTS } from "@/sentinel/forts";
import { FortDashboard } from "@/components/sentinel/FortDashboard";
import type { FortWorkspaceContext } from "@/lib/fort-workspace.functions";
import type { FortPageUser } from "@/components/sentinel/FortPage";

export const Route = createFileRoute("/fort/broker")({
  component: BrokerFort,
});

function BrokerFort() {
  const { user, fort: workspace } = Route.useRouteContext() as {
    user: FortPageUser;
    fort: FortWorkspaceContext;
  };

  const fort = FORTS.BROKER;

  return (
    <FortDashboard
      fort={fort}
      roles={user.roles}
      workspace={workspace}
    />
  );
}
