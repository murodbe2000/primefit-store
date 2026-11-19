-- Restrict privileged PrimeFit functions to the roles that need them.
-- is_admin() and the inventory approval RPC are called by signed-in admin users
-- and by RLS policies; anonymous access is not required.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.primefit_approve_order_and_reduce_inventory(uuid) from public, anon;
grant execute on function public.primefit_approve_order_and_reduce_inventory(uuid) to authenticated;

-- This function is invoked only by the auth.users trigger.
revoke execute on function public.primefit_new_customer_profile() from public, anon, authenticated;
