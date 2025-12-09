<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🧠 BrainDeck - Smart Flashcard Learning Platform

An AI-powered flashcard application with spaced repetition, Kahoot-style quizzes, and intelligent study tracking. Perfect for students, teachers, and lifelong learners.

## ✨ Features

- 🧠 **Spaced Repetition System** - Optimized learning with the proven SM-2 algorithm
- 🎯 **Kahoot-Style Quizzes** - Timed multiple-choice quizzes with instant feedback
- 🤖 **AI Flashcard Generation** - Create study decks from any topic using AI
- 📊 **Study Analytics** - Track progress with detailed weekly activity charts
- 💾 **Custom Decks** - Build your own flashcard decks manually
- 📈 **Session Tracking** - Monitor cards studied, time spent, and confidence ratings
- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations
- 📱 **Mobile-Friendly** - Study seamlessly on any device
- 🔒 **Secure Authentication** - Protected user accounts with email verification

---

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **A Supabase account** (free) - [Sign up here](https://supabase.com/)
- **A Google Gemini API key** (free) - [Get one here](https://aistudio.google.com/app/apikey)

---

## 📦 Installation & Setup

### Step 1: Fork & Clone

1. **Fork this repository** (click the Fork button at the top right)

2. **Clone your forked repository:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Brain-Deck2.git
   cd Brain-Deck2
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

---

### Step 2: Set Up Supabase Database

1. **Create a new project** at [supabase.com/dashboard](https://supabase.com/dashboard)

2. **Run the database migrations:**
   - Go to **SQL Editor** in your Supabase dashboard
   - Open and run each migration file in order:
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_create_decks_table.sql`
     - `supabase/migrations/003_create_cards_table.sql`
     - `supabase/migrations/004_create_study_sessions.sql`
     - `supabase/migrations/005_make_username_case_insensitive.sql`

3. **Get your Supabase credentials:**
   - Go to **Settings** → **API**
   - Copy your **Project URL** and **anon/public key**

---

### Step 3: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the generated key

---

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

**⚠️ Important:** 
- Replace the placeholder values with your actual keys
- Never commit your `.env` file to Git
- The `.env` file is already in `.gitignore`

---

### Step 5: Configure Supabase Authentication

**IMPORTANT:** To avoid 404 errors on email confirmation:

1. Go to **Authentication** → **URL Configuration** in Supabase
2. Set **Site URL** to:
   - For local: `http://localhost:5173`
   - For production: Your Vercel URL (e.g., `https://your-app.vercel.app`)
3. Add to **Redirect URLs**:
   - `http://localhost:5173/**`
   - `https://your-app.vercel.app/**` (when deployed)
4. Click **Save**

---

### Step 6: Run Locally

```bash
npm run dev
```

Open your browser and navigate to: **http://localhost:5173**

🎉 **You're all set!** Create an account and start building your first study deck.

---

## 🌐 Deploy to Vercel (Production)

### Step 1: Push to GitHub

Make sure your code is pushed to your GitHub repository:

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **Add New** → **Project**
3. Import your **Brain-Deck2** repository from GitHub
4. Vercel will auto-detect it as a **Vite** project

### Step 3: Configure Build Settings

Verify these settings (should be auto-detected):
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 4: Add Environment Variables

In Vercel project settings, go to **Settings** → **Environment Variables** and add:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

**Important:**
- Add these for **all environments** (Production, Preview, Development)
- Click **Save** after each variable

### Step 5: Update Supabase Site URL

1. Copy your Vercel deployment URL (e.g., `https://brain-deck2.vercel.app`)
2. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
3. Update **Site URL** to your Vercel URL
4. Add your Vercel URL to **Redirect URLs**: `https://your-app.vercel.app/**`
5. Click **Save**

### Step 6: Deploy

Click **Deploy** in Vercel. Your app will be live in ~2 minutes! 🚀

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React** | Frontend framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Fast build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Supabase** | Backend (database, auth, storage) |
| **PostgreSQL** | Relational database (via Supabase) |
| **Google Gemini** | AI flashcard generation |
| **Recharts** | Beautiful activity charts |
| **Lucide Icons** | Modern icon library |

---

## 📁 Project Structure

```
Brain-Deck2/
├── src/
│   ├── components/       # React components
│   │   ├── LandingPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── StudyPage.tsx
│   │   └── QuizPage.tsx
│   ├── lib/
│   │   └── db.ts        # Supabase database functions
│   └── App.tsx          # Main app component
├── supabase/
│   └── migrations/      # Database schema migrations
├── public/              # Static assets
├── .env                 # Environment variables (create this)
└── package.json         # Dependencies
```

---

## 🐛 Troubleshooting

### 404 Error on Email Confirmation?

**Problem:** Clicking the email confirmation link shows "DEPLOYMENT_NOT_FOUND"

**Solution:**
1. Go to Supabase → Authentication → URL Configuration
2. Set **Site URL** to your Vercel URL or `http://localhost:5173`
3. Add to **Redirect URLs** with `/**` suffix
4. Save and test with a new signup

📖 **Detailed guide:** [SUPABASE_URL_FIX_GUIDE.md](SUPABASE_URL_FIX_GUIDE.md)

---

### "Supabase client not configured" Error?

**Solution:** Make sure your `.env` file exists and has the correct values:
```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AI...
```

Restart your dev server after creating/updating `.env`.

---

### Profile Not Found After Signup?

**Solution:** Run all database migrations in Supabase SQL Editor. See Step 2 above.

---

### AI Generation Not Working?

**Solution:** 
- Check your Gemini API key is valid
- Make sure `VITE_GEMINI_API_KEY` is in your `.env` file
- Restart the dev server
- Check the browser console for error messages

---

## 🎓 How to Use

### 1. Create a Deck

**Option A - AI Generation:**
- Click **AI Generator** in the sidebar
- Enter a topic (e.g., "Spanish Verbs", "Biology Chapter 3")
- Choose number of cards
- Click **Generate**

**Option B - Manual Creation:**
- Click **Deck Builder** in the sidebar
- Enter deck name
- Add cards manually with questions and answers

### 2. Study with Spaced Repetition

- Click **Decks** and select a deck
- Click **Study**
- Review the question, think of the answer
- Reveal the answer
- Click **Again** (repeat soon) or **Next** (review later)
- Complete your session and rate your confidence

### 3. Take a Quiz

- Click **Quiz** in the sidebar
- Select a deck
- Answer multiple-choice questions against the clock
- Get instant feedback and final score

### 4. Track Progress

- Check your **Dashboard** for weekly activity
- See cards studied, sessions completed, and total study time
- Monitor your learning streaks

---

## 🔐 Security Notes

- All passwords are hashed by Supabase
- Email verification is required by default
- Row Level Security (RLS) ensures users only see their own data
- API keys are never exposed to the client (except Supabase anon key, which is safe)
- Never share your `.env` file or commit it to Git

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 📝 License

MIT License - Feel free to fork, modify, and use this project for personal or commercial purposes.

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⭐ Show Your Support

If you find this project helpful, please give it a star! ⭐

---

## 📧 Support & Issues

- **Found a bug?** Open an issue on GitHub
- **Have a question?** Check the troubleshooting guides above
- **Need help?** Review the [SUPABASE_SETUP.md](SUPABASE_SETUP.md) and [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) guides

---

<div align="center">

**Built with ❤️ for learners everywhere**

[Report Bug](https://github.com/Jaabir-Ahamed/Brain-Deck2/issues) · [Request Feature](https://github.com/Jaabir-Ahamed/Brain-Deck2/issues)

</div>
