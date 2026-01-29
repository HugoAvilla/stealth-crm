-- Add name length constraint to profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_name_length_check 
CHECK (length(name) <= 100 AND length(name) > 0);

-- Update handle_new_user function to sanitize and validate name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sanitized_name text;
BEGIN
    -- Get name from metadata, fallback to email username
    sanitized_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    
    -- Trim whitespace
    sanitized_name := trim(sanitized_name);
    
    -- Limit length to 100 characters
    IF length(sanitized_name) > 100 THEN
        sanitized_name := left(sanitized_name, 100);
    END IF;
    
    -- Ensure minimum length
    IF length(sanitized_name) < 1 THEN
        sanitized_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, sanitized_name, NEW.email);
    
    -- Create role NENHUM (pending approval)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'NENHUM');
    
    RETURN NEW;
END;
$$;