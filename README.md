<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BrainDeck - Smart Flashcard Learning Platform

An AI-powered flashcard application with spaced repetition, Kahoot-style quizzes, and intelligent study tracking.

## 🚨 Quick Fixes

### Email Confirmation 404 Error?
If you're getting a 404 error when clicking the email confirmation link:
👉 **[READ THIS FIRST: SUPABASE_URL_FIX_GUIDE.md](SUPABASE_URL_FIX_GUIDE.md)** 👈

**Quick Fix (2 minutes):**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
3. Add to **Redirect URLs**: `https://your-app.vercel.app/**`
4. Save and test with a new signup

---

## 📚 Setup Guides

- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Initial Supabase configuration
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Deploy to Vercel
- **[EMAIL_CONFIRMATION_FIX.md](EMAIL_CONFIRMATION_FIX.md)** - Detailed email fix guide
- **[SIGNUP_TROUBLESHOOTING.md](SIGNUP_TROUBLESHOOTING.md)** - Common signup issues

---

## 🚀 Run Locally

**Prerequisites:** Node.js 16+

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jaabir-Ahamed/Brain-Deck2.git
   cd Brain-Deck2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

---

## ✨ Features

- 🧠 **Spaced Repetition System (SRS)** - Optimize your learning with SM-2 algorithm
- 🎯 **Kahoot-Style Quizzes** - Test your knowledge with timed multiple-choice questions
- 🤖 **AI Flashcard Generation** - Create decks from topics using Google Gemini
- 📊 **Study Analytics** - Track your progress with detailed activity charts
- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations
- 📱 **Mobile-Friendly** - Study anywhere on any device
- 🔒 **Secure Authentication** - User accounts with Supabase Auth

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** Google Gemini API
- **Deployment:** Vercel
- **Charts:** Recharts

---

## 📖 Documentation

- [Supabase Setup Guide](SUPABASE_SETUP.md) - Database and authentication setup
- [Vercel Deployment Guide](VERCEL_DEPLOYMENT.md) - Deploy to production
- [Email Fix Guide](SUPABASE_URL_FIX_GUIDE.md) - Fix 404 email errors
- [Signup Troubleshooting](SIGNUP_TROUBLESHOOTING.md) - Common signup issues

---

## 🐛 Common Issues

### Email confirmation not working?
See [SUPABASE_URL_FIX_GUIDE.md](SUPABASE_URL_FIX_GUIDE.md)

### Profile not found after signup?
Run the database migration in Supabase. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

### Supabase not configured error?
Add environment variables. See setup section above.

---

## 📝 License

MIT License - Feel free to use this project for learning and development.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Support

Having issues? Check the documentation files above or open an issue on GitHub.
