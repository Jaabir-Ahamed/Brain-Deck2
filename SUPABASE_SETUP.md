# Supabase Migration Guide

This guide will help you set up Supabase for BrainDeck.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project named "Brain Deck" (or any name you prefer)

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon/public key** (this is your `VITE_SUPABASE_ANON_KEY`)

## Step 2: Set Up Environment Variables

1. Create a `.env` file in the `Brain-Deck2` directory
2. Add your credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

## Step 3: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_initial_schema.sql`
3. Copy the entire SQL content
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

This will create:
- `profiles` table (extends auth.users)
- `decks` table
- `cards` table
- Row Level Security (RLS) policies
- Database triggers for automatic profile creation
- Indexes for performance

## Step 4: Install Dependencies

```bash
cd Brain-Deck2
npm install
```

## Step 5: Start the Development Server

```bash
npm run dev
```

## What Changed

### Authentication
- **Before**: Mock authentication with localStorage
- **After**: Real Supabase Auth with email/password

### Data Storage
- **Before**: localStorage (browser-only, no persistence across devices)
- **After**: Supabase PostgreSQL database (persistent, accessible from any device)

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic profile creation on signup

## Database Schema

### Tables

1. **profiles** - User profile information
   - Extends Supabase auth.users
   - Stores: id, email, name, timestamps

2. **decks** - Flashcard decks
   - Stores: id, user_id, title, subject, card_count, timestamps
   - Foreign key to auth.users

3. **cards** - Individual flashcards
   - Stores: id, deck_id, type, front, back, SRS data, timestamps
   - Foreign key to decks

### Row Level Security

All tables have RLS policies that ensure:
- Users can only view their own data
- Users can only create/update/delete their own data
- Cards are accessible only through their parent decks

## Troubleshooting

### "Supabase URL and Anon Key must be set"
- Make sure your `.env` file exists and has the correct variable names
- Variable names must start with `VITE_` for Vite to expose them

### "Profile not found" after signup
- The database trigger should create profiles automatically
- If it doesn't, check the SQL Editor for errors
- You can manually create a profile in the Supabase dashboard

### Authentication errors
- Verify your Supabase URL and anon key are correct
- Check that email confirmation is disabled in Supabase Auth settings (for development)
- Or enable email confirmation and check your email

### Database connection errors
- Verify your Supabase project is active
- Check that the migration was run successfully
- Ensure RLS policies are enabled

## Next Steps

- [ ] Set up email confirmation (optional, for production)
- [ ] Configure password reset flows
- [ ] Add social authentication (Google, GitHub, etc.)
- [ ] Set up database backups
- [ ] Configure production environment variables

