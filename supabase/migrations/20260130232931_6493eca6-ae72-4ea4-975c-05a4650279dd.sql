-- =====================================================
-- SECURITY FIX: Address 3 critical security issues
-- =====================================================

-- ISSUE 1: Coupon Usage Table Allows Unrestricted Insertions
-- Drop the overly permissive policy and create a restrictive one
-- The apply_coupon SECURITY DEFINER function will still work
DROP POLICY IF EXISTS "System can insert coupon usage" ON public.coupon_usage;

-- No direct inserts allowed - only through SECURITY DEFINER function
CREATE POLICY "No direct coupon usage insert"
ON public.coupon_usage FOR INSERT
WITH CHECK (false);

-- =====================================================

-- ISSUE 2: Payment Details Exposed to Unauthenticated Users
-- Restrict system_config to authenticated users only
DROP POLICY IF EXISTS "Anyone can view system config" ON public.system_config;

CREATE POLICY "Authenticated users can view system config"
ON public.system_config FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =====================================================

-- ISSUE 3: Coupon Application Function Lacks Input Validation
-- Replace with a secure version that validates ownership and prevents abuse
CREATE OR REPLACE FUNCTION public.apply_coupon(
  coupon_code_input text,
  p_user_id uuid,
  p_subscription_id bigint,
  p_discount_applied numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_record RECORD;
  v_subscription_user_id uuid;
BEGIN
  -- SECURITY: Verify the caller owns this subscription
  SELECT user_id INTO v_subscription_user_id
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  IF v_subscription_user_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;
  
  -- SECURITY: Verify caller is the subscription owner (ignore p_user_id, use auth.uid())
  IF v_subscription_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot apply coupon to another user''s subscription';
  END IF;
  
  -- Get and validate coupon exists and is active
  SELECT * INTO v_coupon_record
  FROM public.discount_coupons
  WHERE code = UPPER(coupon_code_input)
  AND is_active = true
  AND (valid_until IS NULL OR valid_until > now())
  AND (usage_limit IS NULL OR usage_count < usage_limit);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or exhausted coupon';
  END IF;
  
  -- SECURITY: Prevent duplicate coupon usage on same subscription
  IF EXISTS (
    SELECT 1 FROM public.coupon_usage
    WHERE coupon_id = v_coupon_record.id
    AND subscription_id = p_subscription_id
  ) THEN
    RAISE EXCEPTION 'Coupon already applied to this subscription';
  END IF;
  
  -- Increment usage counter
  UPDATE public.discount_coupons
  SET usage_count = usage_count + 1
  WHERE id = v_coupon_record.id;
  
  -- Record usage (use auth.uid() instead of trusting p_user_id)
  INSERT INTO public.coupon_usage (coupon_id, user_id, subscription_id, discount_applied)
  VALUES (
    v_coupon_record.id,
    auth.uid(),
    p_subscription_id,
    p_discount_applied
  );
END;
$$;