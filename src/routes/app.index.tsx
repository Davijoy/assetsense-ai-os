import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /app — FORT IS THE GATEWAY.
 *
 * This route used to redirect straight to /app/crm, which is exactly how a user
 * bypassed FORT: "Open Console" landed them in the CRM with no workspace, no
 * membership and no resolved role, so the shell labelled them "viewer".
 *
 * It now sends them to FORT, which resolves
 *
 *     workspace → membership → app_role → modules
 *
 * server-side and then opens the module it actually granted. No loop: /fort's
 * "Enter Workspace" targets a CHILD route (/app/crm, /app/market, …), never
 * /app/ itself.
 *
 * Nothing is authorized here. This is a redirect; /app's own beforeLoad and each
 * module's gate do the deciding.
 */
export const Route = createFileRoute("/app/")({
  beforeLoad: () => {
    throw redirect({ to: "/fort" });
  },
});
