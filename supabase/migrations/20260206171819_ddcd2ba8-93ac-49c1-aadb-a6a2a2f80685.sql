-- 1. Corrigir usuários existentes que são donos com role NENHUM
UPDATE user_roles ur
SET role = 'ADMIN'
FROM companies c
WHERE c.owner_id = ur.user_id
  AND ur.role = 'NENHUM';

-- 2. Inserir role ADMIN para donos que não têm nenhuma role
INSERT INTO user_roles (user_id, role)
SELECT c.owner_id, 'ADMIN'
FROM companies c
LEFT JOIN user_roles ur ON ur.user_id = c.owner_id
WHERE ur.user_id IS NULL;

-- 3. Criar função para garantir ADMIN em novos donos
CREATE OR REPLACE FUNCTION public.ensure_owner_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.owner_id, 'ADMIN')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'ADMIN';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Criar trigger
DROP TRIGGER IF EXISTS trigger_ensure_owner_admin ON companies;
CREATE TRIGGER trigger_ensure_owner_admin
AFTER INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION ensure_owner_is_admin();