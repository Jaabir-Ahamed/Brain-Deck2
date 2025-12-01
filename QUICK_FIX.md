# Quick Fix Guide

## Issue: "Username is already taken" during signup (even with empty table)

### Solution: Run the Database Migration and Grant Permissions

The `is_username_available` function must exist AND have proper permissions in your Supabase database. 

1. Go to your Supabase Dashboard → **SQL Editor**
2. Run this SQL to create the function:

```sql
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
```

3. **IMPORTANT**: Grant execute permission to anonymous users for BOTH functions:

```sql
-- Allow public access to check username availability (needed for signup)
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO authenticated;

-- Allow public access to get email by username (needed for login)
GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO authenticated;
```

4. Verify it was created and has permissions:
```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'is_username_available';

-- Check permissions
SELECT 
  p.proname as function_name,
  r.rolname as role_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_proc_acl a ON p.oid = a.oid
JOIN pg_roles r ON a.aclrole = r.oid
WHERE p.proname = 'is_username_available';
```

### If you get a 401 error:

This means the function exists but permissions aren't set. Run the GRANT statements above.

## Issue: Password Reset Shows Configuration Error

### Check Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Verify these are set (with `VITE_` prefix):
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
3. Make sure they're set for **Production**, **Preview**, and **Development**
4. **Redeploy** after adding/changing variables

### Get Your Supabase Credentials

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## Debugging

Open your browser's Developer Console (F12) and check for:
- Error messages with details
- Console logs showing username check results
- Network tab to see API calls

The improved error messages will now tell you exactly what's wrong.

