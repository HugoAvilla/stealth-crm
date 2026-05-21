-- Create or replace the RPC to update plan price and cascade to subscriptions
CREATE OR REPLACE FUNCTION public.master_update_plan_price(
    p_plan_code text,
    p_billing_period text,
    p_new_price numeric,
    p_notes text DEFAULT NULL::text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_price numeric;
    v_master_id uuid;
BEGIN
    -- Get the current authenticated user
    v_master_id := auth.uid();

    -- Get old price
    SELECT price INTO v_old_price
    FROM public.plan_prices
    WHERE plan_code = p_plan_code AND billing_period = p_billing_period;

    -- Update price in plan_prices
    UPDATE public.plan_prices
    SET price = p_new_price
    WHERE plan_code = p_plan_code AND billing_period = p_billing_period;

    -- Update all existing subscriptions that match this plan and billing period
    UPDATE public.subscriptions
    SET plan_price = p_new_price,
        final_price = p_new_price
    WHERE plan_code = p_plan_code AND billing_period = p_billing_period;

    -- Log action in master_actions using reason (not details)
    INSERT INTO public.master_actions (
        action_type,
        old_value,
        new_value,
        reason,
        performed_by
    ) VALUES (
        'update_plan_price',
        v_old_price::text,
        p_new_price::text,
        p_notes,
        v_master_id
    );

    RETURN true;
END;
$$;

-- Fix existing mismatched prices by synchronizing subscriptions with plan_prices
UPDATE public.subscriptions s
SET plan_price = p.price,
    final_price = p.price
FROM public.plan_prices p
WHERE s.plan_code = p.plan_code 
  AND s.billing_period = p.billing_period;
