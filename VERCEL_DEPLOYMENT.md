# Vercel Deployment Guide

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your Supabase project set up and migration run
3. Your Gemini API key

## Step 1: Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New Project**
3. Import your GitHub repository (Brain-Deck2)
4. Vercel will auto-detect it's a Vite project

## Step 2: Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Step 3: Add Environment Variables

In the Vercel project settings, go to **Settings** → **Environment Variables** and add:

### Required Variables:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

**Important Notes:**
- All variables MUST start with `VITE_` prefix
- Add them for all environments (Production, Preview, Development)
- Never commit these values to git

### How to Get Values:

1. **Supabase URL & Key**: 
   - Go to Supabase Dashboard → Settings → API
   - Copy Project URL → `VITE_SUPABASE_URL`
   - Copy anon/public key → `VITE_SUPABASE_ANON_KEY`

2. **Gemini API Key**:
   - Go to https://aistudio.google.com/app/apikey
   - Copy your API key → `VITE_GEMINI_API_KEY`

## Step 4: Deploy

1. Click **Deploy** in Vercel
2. Wait for the build to complete
3. Your app will be live at `your-project.vercel.app`

## Step 5: Verify Database Migration

After deployment, make sure your Supabase database migration has been run:

1. Go to your Supabase project dashboard
2. Open **SQL Editor**
3. Run the migration from `supabase/migrations/001_initial_schema.sql`
4. This creates the tables, RLS policies, and triggers

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Make sure `package.json` has all dependencies

### "Supabase not configured" Error
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel
- Make sure they start with `VITE_` prefix
- Redeploy after adding variables

### "GEMINI_API_KEY not configured" Error
- Verify `VITE_GEMINI_API_KEY` is set in Vercel
- Make sure it starts with `VITE_` prefix
- Redeploy after adding variable

### Database Connection Issues
- Verify the migration has been run in Supabase
- Check that RLS policies are enabled
- Verify Supabase project is active

### Authentication Not Working
- Check that email confirmation settings match your needs
- Verify the database trigger for profile creation exists
- Check Supabase Auth settings

## Custom Domain (Optional)

1. Go to **Settings** → **Domains** in Vercel
2. Add your custom domain
3. Follow DNS configuration instructions

## Environment-Specific Variables

You can set different values for:
- **Production**: Your live site
- **Preview**: Pull request previews
- **Development**: Local development (uses `.env.local`)

## Continuous Deployment

Vercel automatically deploys:
- Every push to `main` branch → Production
- Every pull request → Preview deployment
- You can also trigger manual deployments

## Monitoring

- Check **Analytics** tab for performance metrics
- Check **Logs** tab for runtime errors
- Set up **Alerts** for build failures

## Next Steps

1. ✅ Set up environment variables in Vercel
2. ✅ Run database migration in Supabase
3. ✅ Deploy and test
4. ✅ Set up custom domain (optional)
5. ✅ Configure email confirmation in Supabase (for production)

