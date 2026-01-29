-- Corrigir funções com search_path mutável

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_paid AND NEW.account_id IS NOT NULL THEN
        IF NEW.type = 'Entrada' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Saida' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_transfer()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.from_account_id;
    UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.movement_type = 'Entrada' THEN
        UPDATE public.materials SET current_stock = current_stock + NEW.quantity WHERE id = NEW.material_id;
    ELSIF NEW.movement_type = 'Saida' THEN
        UPDATE public.materials SET current_stock = current_stock - NEW.quantity WHERE id = NEW.material_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_single_main_account()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_main = true THEN
        UPDATE public.accounts SET is_main = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$;