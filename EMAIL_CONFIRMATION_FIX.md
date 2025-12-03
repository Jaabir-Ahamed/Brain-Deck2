# Email Confirmation 404 Error Fix

If you're getting a **404: NOT_FOUND (DEPLOYMENT_NOT_FOUND)** error when clicking the email confirmation link from Supabase, follow these steps:

## Problem

The Supabase email confirmation link is redirecting to an incorrect URL, causing a 404 error on Vercel.

## Solution

You need to configure the correct **Site URL** in your Supabase project settings.

### Step 1: Get Your Vercel Deployment URL

1. Go to your Vercel dashboard
2. Find your BrainDeck project
3. Copy your production URL (e.g., `https://your-project.vercel.app` or your custom domain)

### Step 2: Update Supabase Site URL

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration** (in the left sidebar under Settings)
3. Find the **Site URL** field
4. Update it to your Vercel production URL:
   ```
   https://your-project.vercel.app
   ```
   Or if you have a custom domain:
   ```
   https://yourdomain.com
   ```
5. Click **Save**

### Step 3: Update Redirect URLs (Optional but Recommended)

While you're in the URL Configuration section:

1. Scroll down to **Redirect URLs**
2. Add your Vercel URL:
   ```
   https://your-project.vercel.app/**
   ```
3. If testing locally, also add:
   ```
   http://localhost:5173/**
   ```
4. Click **Save**

### Step 4: Test Email Confirmation

1. Try signing up with a new email address
2. Check your email for the confirmation link
3. Click the link - it should now redirect to your app correctly
4. You should see the login page with a message to sign in

## Additional Notes

### For Development

If you're testing locally and want email confirmation to work:

1. Set the Site URL to `http://localhost:5173`
2. Add `http://localhost:5173/**` to Redirect URLs
3. Remember to change it back to your production URL when deploying

### Alternative: Disable Email Confirmation (Development Only)

For faster development, you can temporarily disable email confirmation:

1. Go to **Authentication** → **Settings** in Supabase
2. Find **Enable email confirmations**
3. Toggle it **OFF**
4. Click **Save**

**Note:** Re-enable this for production!

### Password Reset Links

The same Site URL configuration affects password reset links. If password reset emails aren't working, check that the Site URL is correct.

## What Happens Behind the Scenes

When a user signs up:
1. Supabase sends a confirmation email
2. The email contains a link with an access token
3. The link redirects to your Site URL with the token in the URL hash
4. Your app (in `App.tsx`) detects the token and confirms the email
5. The user is then redirected to the login page

## Verification

After updating the Site URL, you can verify it's working by:

1. Going to **Authentication** → **URL Configuration** in Supabase
2. Checking that **Site URL** matches your production URL
3. Testing a new signup to ensure the email link works

## Common Issues

### Still Getting 404 After Updating Site URL

- Wait a few minutes for changes to propagate
- Clear your browser cache
- Try incognito/private browsing mode
- Check that you clicked **Save** in Supabase

### Multiple Deployments (Preview URLs)

If you have multiple Vercel preview deployments:
- The Site URL should point to your **production** URL
- Preview deployments may have email confirmation issues
- Consider disabling email confirmation for development

### Custom Domains

If using a custom domain:
- Make sure the custom domain is fully configured in Vercel
- Use the custom domain as your Site URL in Supabase
- Add both the custom domain and Vercel URL to Redirect URLs

## Need Help?

If you're still having issues:

1. Check Vercel logs for any errors
2. Check Supabase Auth logs under **Authentication** → **Logs**
3. Verify your environment variables are set correctly in Vercel
4. Make sure the database migrations have been run
5. Confirm the `profiles` table trigger is working

For more setup information, see:
- `SUPABASE_SETUP.md` - Initial Supabase configuration
- `VERCEL_DEPLOYMENT.md` - Vercel deployment guide
- `SIGNUP_TROUBLESHOOTING.md` - General signup issues

