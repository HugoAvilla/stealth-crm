-- Fix existing users who are company owners but have NENHUM role
UPDATE public.user_roles ur
SET role = 'ADMIN'
FROM public.companies c
WHERE c.owner_id = ur.user_id
AND ur.role = 'NENHUM';