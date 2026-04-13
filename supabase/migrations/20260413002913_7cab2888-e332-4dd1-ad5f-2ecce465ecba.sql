
-- Add ban/suspend and referral columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by text;

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  referrer_amount integer NOT NULL DEFAULT 300,
  referred_amount integer NOT NULL DEFAULT 200,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "System can insert referral rewards"
  ON public.referral_rewards FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);

CREATE POLICY "Admins can manage all referral rewards"
  ON public.referral_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create shared_chats table
CREATE TABLE IF NOT EXISTS public.shared_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Shared Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared chats"
  ON public.shared_chats FOR SELECT USING (true);

CREATE POLICY "Users can insert own shared chats"
  ON public.shared_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared chats"
  ON public.shared_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Update handle_new_user to add referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, is_verified, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'traxxiontech@gmail.com' THEN true ELSE false END,
    substr(md5(NEW.id::text || now()::text), 1, 8)
  );
  INSERT INTO public.token_balances (user_id, balance)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = 'traxxiontech@gmail.com' THEN 10000 ELSE 1000 END
  );
  IF NEW.email = 'traxxiontech@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  -- Handle referral
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    UPDATE public.profiles SET referred_by = NEW.raw_user_meta_data->>'referral_code' WHERE user_id = NEW.id;
    -- Give referred user bonus
    UPDATE public.token_balances SET balance = balance + 200 WHERE user_id = NEW.id;
    -- Give referrer bonus
    UPDATE public.token_balances SET balance = balance + 300
    WHERE user_id = (SELECT user_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1);
    -- Record reward
    INSERT INTO public.referral_rewards (referrer_user_id, referred_user_id)
    VALUES (
      (SELECT user_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
