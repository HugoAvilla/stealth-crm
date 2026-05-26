-- Add lost_width column to material_losses table
ALTER TABLE public.material_losses
  ADD COLUMN lost_width numeric;
