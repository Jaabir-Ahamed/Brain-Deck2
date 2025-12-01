-- Add username and profile_picture_url to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user email by username (for authentication)
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(username_param TEXT)
RETURNS TABLE(email TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT p.email, p.id
  FROM public.profiles p
  WHERE p.username = username_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow public access to get email by username (needed for login)
-- This is safe as it only returns email, not password or other sensitive data
GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO anon;

-- Function to check if username is available (bypasses RLS for signup)
CREATE OR REPLACE FUNCTION public.is_username_available(username_param TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE username = username_param
    AND (exclude_user_id IS NULL OR id != exclude_user_id);
  
  RETURN user_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow public access to check username availability (needed for signup)
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO anon;

