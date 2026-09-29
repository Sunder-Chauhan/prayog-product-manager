ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cutout_image_url text,
  ADD COLUMN IF NOT EXISTS scenes jsonb NOT NULL DEFAULT '[]'::jsonb;