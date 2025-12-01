# Gemini API Key Setup

## Important: Vite Environment Variable Prefix

Vite only exposes environment variables to the client-side code if they start with `VITE_`. 

## Step 1: Get Your Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

## Step 2: Add to .env.local

Add the API key to your `.env.local` file in the `Brain-Deck2` directory:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**Important**: The variable name MUST start with `VITE_` for it to be accessible in the browser.

## Step 3: Restart Dev Server

After adding the API key:

1. Stop the dev server (Ctrl+C)
2. Restart it:
   ```bash
   npm run dev
   ```

Vite reads environment variables when it starts, so you must restart after changing `.env` files.

## Troubleshooting

### "GEMINI_API_KEY is not configured"
- Make sure the variable name is `VITE_GEMINI_API_KEY` (with `VITE_` prefix)
- Make sure it's in `.env.local` or `.env` file
- Restart the dev server after adding it

### "Invalid API Key"
- Verify the API key is correct (no extra spaces, quotes, etc.)
- Make sure you copied the entire key
- Check that the key is active in Google AI Studio

### Still not working?
1. Check browser console for errors
2. Verify the `.env.local` file is in the `Brain-Deck2` directory (same level as `package.json`)
3. Make sure there are no quotes around the API key value
4. Try using `.env` instead of `.env.local`

## Example .env.local file

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini API Key (MUST have VITE_ prefix)
VITE_GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional: Without VITE_ prefix (won't work in browser)
# GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

