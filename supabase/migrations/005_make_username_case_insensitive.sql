-- Make username lookups case-insensitive
-- This fixes the issue where users can't log in if they type username with different casing

-- Update the get_user_email_by_username function to be case-insensitive
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(username_param TEXT)
RETURNS TABLE(email TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT p.email, p.id
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(username_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the is_username_available function to be case-insensitive
CREATE OR REPLACE FUNCTION public.is_username_available(username_param TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE LOWER(username) = LOWER(username_param)
    AND (exclude_user_id IS NULL OR id != exclude_user_id);
  
  RETURN user_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing usernames to lowercase for consistency
UPDATE public.profiles
SET username = LOWER(username)
WHERE username IS NOT NULL AND username != LOWER(username);

