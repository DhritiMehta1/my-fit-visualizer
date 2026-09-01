CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  body_shape TEXT NOT NULL DEFAULT 'rectangle',
  gender_presentation TEXT NOT NULL DEFAULT 'feminine',
  height_cm NUMERIC NOT NULL DEFAULT 165,
  weight_kg NUMERIC NOT NULL DEFAULT 60,
  bust_cm NUMERIC NOT NULL DEFAULT 90,
  waist_cm NUMERIC NOT NULL DEFAULT 72,
  hips_cm NUMERIC NOT NULL DEFAULT 96,
  shoulder_cm NUMERIC NOT NULL DEFAULT 38,
  inseam_cm NUMERIC NOT NULL DEFAULT 76,
  skin_tone TEXT NOT NULL DEFAULT '#c99770',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'closet',
  category TEXT NOT NULL DEFAULT 'top',
  color TEXT NOT NULL DEFAULT '#1a1a1a',
  size TEXT,
  price NUMERIC,
  source_url TEXT,
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'cart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wardrobe_items TO authenticated;
GRANT ALL ON public.wardrobe_items TO service_role;
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wardrobe" ON public.wardrobe_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.saved_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled look',
  item_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_looks TO authenticated;
GRANT ALL ON public.saved_looks TO service_role;
ALTER TABLE public.saved_looks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own looks" ON public.saved_looks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();