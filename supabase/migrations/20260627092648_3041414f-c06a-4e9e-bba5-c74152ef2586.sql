
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_workspace_id()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(UUID, TEXT)       FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_workspace_id()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT)       TO authenticated, service_role;
