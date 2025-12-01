# Signup Troubleshooting

If you're getting "Account created but profile not found" or similar errors during signup, follow these steps:

## Step 1: Run the Database Migration

The most common cause is that the database migration hasn't been run yet. The migration creates the `profiles` table and the trigger that automatically creates profiles.

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

## Step 2: Check Email Confirmation Settings

If email confirmation is enabled in Supabase, you'll need to confirm your email before you can log in.

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Look for **"Enable email confirmations"**
3. For development, you can disable it temporarily
4. For production, keep it enabled and check your email after signup

## Step 3: Verify the Trigger Exists

After running the migration, verify the trigger was created:

1. In Supabase SQL Editor, run:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. You should see a row returned

## Step 4: Test Profile Creation

Test if the trigger works:

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Create a test user manually
3. Check if a profile was created in **Table Editor** → **profiles**

If no profile is created, the trigger might not be working. Check the SQL Editor for any errors.

## Step 5: Check RLS Policies

Make sure Row Level Security is set up correctly:

1. In Supabase dashboard, go to **Table Editor** → **profiles**
2. Click on the **Policies** tab
3. You should see policies for:
   - "Users can view own profile"
   - "Users can update own profile"
   - "Users can insert own profile"

## Common Solutions

### "Profile not found" after signup
- **Solution**: Run the database migration (Step 1)
- **Alternative**: Disable email confirmation temporarily for testing

### "Permission denied" errors
- **Solution**: Check that RLS policies are created (Step 5)
- **Check**: Make sure you're using the correct Supabase credentials in `.env`

### Email confirmation required
- **Solution**: Check your email inbox (including spam)
- **Alternative**: Disable email confirmation in Auth settings for development

### Trigger not working
- **Solution**: Re-run the migration SQL
- **Check**: Look for errors in the SQL Editor output

## Quick Fix

If you just want to test the app quickly:

1. **Disable email confirmation**:
   - Go to Authentication → Settings
   - Turn off "Enable email confirmations"
   - Save

2. **Run the migration**:
   - Copy SQL from `supabase/migrations/001_initial_schema.sql`
   - Run it in SQL Editor

3. **Try signing up again**

The app should now work!

