-- Fix: Allow admins to update any profile (needed for ban/suspend)
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update handle_new_user to also handle second admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, is_verified, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email IN ('traxxiontech@gmail.com', 'info@stinger.indevs.in') THEN true ELSE false END,
    substr(md5(NEW.id::text || now()::text), 1, 8)
  );
  INSERT INTO public.token_balances (user_id, balance)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email IN ('traxxiontech@gmail.com', 'info@stinger.indevs.in') THEN 10000 ELSE 1000 END
  );
  IF NEW.email IN ('traxxiontech@gmail.com', 'info@stinger.indevs.in') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  -- Handle referral
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    UPDATE public.profiles SET referred_by = NEW.raw_user_meta_data->>'referral_code' WHERE user_id = NEW.id;
    UPDATE public.token_balances SET balance = balance + 200 WHERE user_id = NEW.id;
    UPDATE public.token_balances SET balance = balance + 300
    WHERE user_id = (SELECT user_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1);
    INSERT INTO public.referral_rewards (referrer_user_id, referred_user_id)
    VALUES (
      (SELECT user_id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;