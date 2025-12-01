# Troubleshooting Blank Screen

If you're seeing a blank black screen, follow these steps:

## 1. Check Browser Console

Open your browser's developer console (F12 or Cmd+Option+I) and look for errors. Common issues:

### Import Errors
- If you see errors about `@supabase/supabase-js` not being found:
  ```bash
  npm install
  ```

### Module Resolution Errors
- If you see errors about modules not being found, check that all files exist in the correct locations

## 2. Install Dependencies

Make sure all packages are installed:
```bash
cd Brain-Deck2
npm install
```

## 3. Check Environment Variables

Create a `.env` file in the `Brain-Deck2` directory:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

**Note**: The app will show a warning banner if Supabase isn't configured, but it should still load.

## 4. Restart Dev Server

After making changes:
```bash
# Stop the server (Ctrl+C)
npm run dev
```

## 5. Clear Browser Cache

Sometimes cached files cause issues:
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear browser cache completely

## 6. Check File Structure

Make sure these files exist:
- `Brain-Deck2/src/lib/supabase.ts`
- `Brain-Deck2/src/lib/db.ts`
- `Brain-Deck2/App.tsx`
- `Brain-Deck2/index.tsx`

## Common Errors

### "Cannot find module '@supabase/supabase-js'"
**Solution**: Run `npm install`

### "Supabase URL and Anon Key must be set"
**Solution**: Create `.env` file with your Supabase credentials (see step 3)

### Blank screen with no console errors
**Solution**: 
1. Check that `index.html` has `<div id="root"></div>`
2. Check that `index.tsx` is importing `App.tsx` correctly
3. Check browser console for any React errors

### App loads but shows "Loading..." forever
**Solution**: 
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify Supabase credentials are correct

## Still Having Issues?

1. Check the browser console for specific error messages
2. Verify all files were saved correctly
3. Try deleting `node_modules` and reinstalling:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

