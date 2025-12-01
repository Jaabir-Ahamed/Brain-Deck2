# Username Authentication & Profile Features Setup

This guide covers the new username-based authentication and enhanced profile features.

## New Features

1. **Username Login** - Users log in with username instead of email
2. **Forgot Password** - Password reset via email
3. **Profile Picture** - Upload and manage profile pictures
4. **Change Username** - Update username from profile
5. **Change Password** - Update password from profile

## Database Migrations

Run these migrations in order in your Supabase SQL Editor:

### 1. Migration 002: Add Username and Profile Picture
File: `supabase/migrations/002_add_username_and_profile_picture.sql`

This adds:
- `username` column to profiles table (unique)
- `profile_picture_url` column to profiles table
- Index on username for faster lookups
- Updated trigger to include username on signup

### 2. Migration 003: Create Storage Bucket
File: `supabase/migrations/003_create_storage_bucket.sql`

This creates:
- `avatars` storage bucket for profile pictures
- RLS policies for public viewing and user uploads

## Setup Steps

### Step 1: Run Database Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run `002_add_username_and_profile_picture.sql`
3. Run `003_create_storage_bucket.sql`

### Step 2: Create Storage Bucket (Alternative Method)

If the SQL migration doesn't work, create the bucket manually:

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `avatars`
4. Public bucket: **Yes** (checked)
5. Click **Create bucket**

### Step 3: Set Storage Policies

If you created the bucket manually, set these policies:

1. Go to **Storage** → **avatars** → **Policies**
2. Add these policies:

**Public Access (SELECT)**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

**Users can upload own avatar (INSERT)**
```sql
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Users can update own avatar (UPDATE)**
```sql
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Users can delete own avatar (DELETE)**
```sql
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## How It Works

### Username Login Flow

1. User enters username and password
2. App looks up email associated with username
3. App authenticates with email and password
4. User is logged in

### Profile Picture Upload

1. User selects image file (< 5MB)
2. File is uploaded to Supabase Storage (`avatars` bucket)
3. Public URL is stored in `profiles.profile_picture_url`
4. Image is displayed in profile

### Change Password

1. User enters current password
2. App verifies current password
3. If correct, password is updated via Supabase Auth
4. User must sign in again with new password

## Troubleshooting

### "Username not found" on login
- User may not have a username set
- Run migration 002 to add username column
- Existing users may need to set username in profile

### Profile picture upload fails
- Check that `avatars` bucket exists
- Verify storage policies are set correctly
- Check file size (must be < 5MB)
- Check file type (must be image)

### "Username is already taken"
- Username must be unique
- Try a different username
- Check existing usernames in profiles table

### Password reset email not received
- Check spam folder
- Verify email confirmation is enabled in Supabase Auth settings
- Check Supabase logs for email delivery errors

## Migration for Existing Users

If you have existing users without usernames:

```sql
-- Set username from email for existing users
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;
```

This sets username to the part before @ in their email.

## Security Notes

- Usernames are case-insensitive (stored lowercase)
- Usernames can only contain letters, numbers, and underscores
- Profile pictures are publicly accessible (stored in public bucket)
- Password changes require current password verification
- Email cannot be changed (Supabase Auth requirement)

