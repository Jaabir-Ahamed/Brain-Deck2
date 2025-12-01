import React, { useState, useEffect } from 'react';
import { Icons } from './components/Icons';
import { User, Deck, Card, AIUploadJob } from './types';
import { generateFlashcardsFromTopic } from './services/geminiService';
import { calculateSm2, getNextReviewDate, formatInterval } from './utils/srs';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from './src/lib/supabase';
import { getProfile, getDecks, createDeck, updateDeck, deleteDeck, getCardsByUser, createCards, updateCard, deleteCard, updateDeckCardCount, getUserEmailByUsername, isUsernameAvailable, updateProfile, getWeeklyActivity, getCards } from './src/lib/db';
import { uploadProfilePicture } from './src/lib/storage';

// --- MOCK DATA REMOVED ---
const INITIAL_DECKS: Deck[] = [];
const INITIAL_CARDS: Card[] = [];

// --- COMPONENT: LAYOUT ---

const Layout: React.FC<{ 
  children: React.ReactNode; 
  page: string; 
  setPage: (p: string) => void;
  user: User | null;
  handleLogout: () => void;
}> = ({ children, page, setPage, user, handleLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <>{children}</>;

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Icons.Dashboard },
    { id: 'decks', label: 'Decks', icon: Icons.Decks },
    { id: 'uploads', label: 'AI Generator', icon: Icons.Upload },
    { id: 'create-deck', label: 'Deck Builder', icon: Icons.Plus },
    { id: 'profile', label: 'Profile', icon: Icons.Profile },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="bg-white text-black p-2 rounded-lg">
            <Icons.Logo size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">BrainDeck</span>
          <button className="md:hidden ml-auto text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <Icons.Close size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pl-3">Core</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
            <Icons.Logout size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border flex items-center px-4 justify-between bg-background">
          <div className="flex items-center gap-2">
             <Icons.Logo size={20} className="text-white" />
             <span className="font-bold">BrainDeck</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground">
            <Icons.Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- PAGE: LOGIN / SIGNUP ---

const AuthPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear errors when switching modes
  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot-password') => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. See SUPABASE_SETUP.md for instructions.');
      setLoading(false);
      return;
    }

    if (mode === 'forgot-password') {
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });

        if (resetError) {
          // Provide more user-friendly error messages
          console.error('Password reset error:', resetError);
          // Check for specific Supabase configuration errors
          if (resetError.message?.includes('Invalid API key') || 
              resetError.message?.includes('JWT') ||
              resetError.code === 'invalid_credentials' ||
              resetError.status === 401) {
            setError('Supabase configuration error. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables in Vercel settings.');
          } else if (resetError.message?.includes('email') || resetError.message?.includes('user')) {
            setError('Invalid email address or email not found. Please check your email and try again.');
          } else {
            setError(resetError.message || 'Failed to send password reset email. Please try again.');
          }
          setLoading(false);
          return;
        }

        setSuccess('Password reset email sent! Please check your inbox.');
        setError('');
        setTimeout(() => {
          handleModeChange('login');
          setSuccess('');
        }, 3000);
      } catch (err: any) {
        // Handle unexpected errors
        console.error('Unexpected error in password reset:', err);
        const errorMessage = err.message || 'Failed to send password reset email.';
        // Only show config error for specific cases
        if (errorMessage.includes('Invalid API key') || 
            errorMessage.includes('JWT') ||
            errorMessage.includes('configuration')) {
          setError('Configuration error. Please check your environment variables in Vercel settings.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        if (!name || !email) {
          setError('Name and email are required for sign up');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        
        // Trim username and check availability (case-insensitive check)
        const trimmedUsername = username.trim();
        
        // Check if username is available (case-insensitive)
        try {
          console.log('Checking username availability during signup:', trimmedUsername);
          const usernameAvailable = await isUsernameAvailable(trimmedUsername);
          console.log('Username available result:', usernameAvailable);
          
          if (!usernameAvailable) {
            setError('Username is already taken. Please choose another.');
            setLoading(false);
            return;
          }
        } catch (usernameError: any) {
          console.error('Error during username check:', usernameError);
          // Show the actual error message to help debug
          setError(usernameError.message || 'Error checking username availability. Please check the browser console for details.');
          setLoading(false);
          return;
        }
        
        // Sign up with Supabase (store username with original case)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              username: trimmedUsername,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (authError) throw authError;

        // Check if email confirmation is required
        if (authData.user && !authData.session) {
          // Email confirmation is enabled - user needs to confirm email
          setError('Account created! Please check your email to confirm your account, then try logging in.');
          setMode('login'); // Switch to login mode
          return;
        }

        if (authData.user && authData.session) {
          // User is immediately authenticated (email confirmation disabled)
          // Try to get profile with retries (trigger might take a moment)
          let profile = null;
          for (let i = 0; i < 5; i++) {
            profile = await getProfile(authData.user.id);
            if (profile) break;
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          if (profile) {
            onLogin(profile);
          } else {
            // Profile not found - try to create it manually
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: authData.user.id,
                  email: authData.user.email || email,
                  name: name,
                  username: trimmedUsername,
                })
                .select()
                .single();

              if (profileError) {
                console.error('Error creating profile:', profileError);
                setError('Account created but profile creation failed. Please try logging in or contact support.');
              } else if (profileData) {
                onLogin({
                  id: profileData.id,
                  email: profileData.email,
                  name: profileData.name,
                  username: profileData.username,
                  profilePictureUrl: profileData.profile_picture_url,
                });
              }
            } catch (err: any) {
              console.error('Error in profile creation fallback:', err);
              setError('Account created but profile not found. The database migration may not have been run. Please check SUPABASE_SETUP.md and try logging in.');
            }
          }
        }
      } else {
        // Sign in with username - lookup email first (case-insensitive lookup)
        const trimmedUsername = username.trim();
        const userEmail = await getUserEmailByUsername(trimmedUsername);
        if (!userEmail) {
          setError('Username not found. Please check your username or sign up.');
          setLoading(false);
          return;
        }

        // Sign in with Supabase using the email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const profile = await getProfile(authData.user.id);
          if (profile) {
            onLogin(profile);
          } else {
            setError('Profile not found. Please contact support.');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="bg-white text-black p-4 rounded-2xl mb-4">
            <Icons.Logo size={48} />
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-muted-foreground text-center">
            {mode === 'login' 
              ? 'Sign in to continue your learning journey.' 
              : mode === 'signup'
              ? 'Start your journey with BrainDeck today.'
              : 'Enter your email to receive a password reset link.'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-card border border-border p-8 rounded-xl shadow-xl space-y-6">
          {mode === 'forgot-password' ? (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground mt-2">We'll send you a link to reset your password</p>
            </div>
          ) : (
            <>
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Display Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
                      placeholder="you@example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Used for account recovery</p>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {mode === 'login' ? 'Username' : 'Choose Username'}
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
                  placeholder={mode === 'login' ? 'your_username' : 'choose_a_username'}
                />
                {mode === 'signup' && (
                  <p className="text-xs text-muted-foreground mt-1">This is how others will see you</p>
                )}
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          {success && (
            <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg flex items-center gap-2">
              <Icons.Check size={16} /> {success}
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2">
              <Icons.Error size={16} /> {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : (mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link')}
          </button>
        </form>
        
        {mode !== 'forgot-password' && (
          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
                className="text-white font-medium cursor-pointer hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            {mode === 'login' && (
              <p className="text-center text-sm text-muted-foreground">
                <button 
                  onClick={() => handleModeChange('forgot-password')}
                  className="text-white font-medium cursor-pointer hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            )}
          </div>
        )}
        
        {mode === 'forgot-password' && (
          <p className="text-center text-sm text-muted-foreground">
            <button 
              onClick={() => handleModeChange('login')}
              className="text-white font-medium cursor-pointer hover:underline"
            >
              Back to login
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

// --- PAGE: DASHBOARD ---

const Dashboard: React.FC<{ decks: Deck[], user: User, setPage: (p: string) => void, onStudy: (d: Deck) => void }> = ({ decks, user, setPage, onStudy }) => {
  const [activityData, setActivityData] = useState<{ date: string; cards: number; sessions: number; totalDuration: number }[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const activity = await getWeeklyActivity(user.id);
        setActivityData(activity);
      } catch (error) {
        console.error('Error loading activity:', error);
      } finally {
        setLoadingActivity(false);
      }
    };
    loadActivity();
  }, [user.id]);

  const data = activityData.map(day => ({
    name: day.date,
    cards: day.cards,
    sessions: day.sessions,
    duration: Math.floor(day.totalDuration / 60) // minutes
  }));

  // Sort by last studied or created
  const recentDecks = [...decks].sort((a, b) => new Date(b.lastStudied || b.created).getTime() - new Date(a.lastStudied || a.created).getTime()).slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1">Here's your learning overview for today.</p>
        </div>
        <button onClick={() => setPage('decks')} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-colors">
          View All Decks
        </button>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 border border-border rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Ready to study?</h3>
          <p className="text-gray-400 max-w-md">
            {decks.length > 0 
              ? `You have ${decks.length} decks available.` 
              : "Create a deck manually or from a PDF to get started!"}
          </p>
        </div>
        {decks.length > 0 ? (
          <button onClick={() => onStudy(recentDecks[0])} className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors min-w-[140px]">
            Start Studying
          </button>
        ) : (
          <div className="flex gap-2">
             <button onClick={() => setPage('create-deck')} className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors">
               Create Deck
             </button>
             <button onClick={() => setPage('uploads')} className="bg-muted text-white font-bold px-6 py-3 rounded-lg hover:bg-muted/80 transition-colors">
               Upload PDF
             </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Decks */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">Recent Decks</h3>
          {decks.length === 0 ? (
            <div className="bg-card border border-dashed border-border p-8 rounded-xl text-center py-12">
              <div className="bg-muted inline-flex p-3 rounded-full mb-4">
                <Icons.Decks size={24} className="text-muted-foreground" />
              </div>
              <h4 className="text-lg font-medium mb-2">No decks yet</h4>
              <p className="text-muted-foreground text-sm mb-4">Get started by creating a new deck.</p>
              <button onClick={() => setPage('create-deck')} className="text-white underline hover:text-gray-300">Go to Deck Builder</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentDecks.map(deck => (
                <div key={deck.id} onClick={() => onStudy(deck)} className="group bg-card border border-border p-5 rounded-xl hover:border-gray-600 cursor-pointer transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-muted rounded-md group-hover:bg-white group-hover:text-black transition-colors">
                      <Icons.Decks size={20} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px]">{deck.subject}</span>
                  </div>
                  <h4 className="font-semibold text-lg mb-1 truncate">{deck.title}</h4>
                  <p className="text-sm text-muted-foreground">{deck.cardCount} cards</p>
                </div>
              ))}
               <div onClick={() => setPage('create-deck')} className="bg-card border border-dashed border-border p-5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-all min-h-[160px]">
                  <Icons.Plus size={32} className="text-muted-foreground mb-2" />
                  <p className="font-medium text-muted-foreground">Create New Deck</p>
               </div>
            </div>
          )}
        </div>

        {/* Stats Chart */}
        <div className="bg-card border border-border p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-6">Activity (Last 7 Days)</h3>
          {loadingActivity ? (
            <div className="h-48 flex items-center justify-center">
              <Icons.Spinner size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#27272a'}}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      formatter={(value: any) => [`${value} cards`, 'Cards Studied']}
                    />
                    <Bar dataKey="cards" radius={[4, 4, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cards > 0 ? '#3b82f6' : '#3f3f46'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Cards:</span>
                  <span className="text-foreground font-semibold">{data.reduce((sum, day) => sum + day.cards, 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Sessions:</span>
                  <span className="text-foreground font-semibold">{data.reduce((sum, day) => sum + day.sessions, 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Time:</span>
                  <span className="text-foreground font-semibold">{Math.floor(data.reduce((sum, day) => sum + (day.duration || 0), 0))}m</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PAGE: DECK BUILDER (MANUAL) ---

const DeckBuilderPage: React.FC<{ onAddDeck: (d: Omit<Deck, 'id' | 'created'>, c: Omit<Card, 'id'>[]) => Promise<void>, setPage: (p: string) => void }> = ({ onAddDeck, setPage }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [draftCards, setDraftCards] = useState<{front: string, back: string}[]>([]);
  
  // Current card inputs
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const addCard = () => {
    if (!front.trim() || !back.trim()) return;
    setDraftCards([...draftCards, { front, back }]);
    setFront('');
    setBack('');
  };

  const removeCard = (index: number) => {
    setDraftCards(draftCards.filter((_, i) => i !== index));
  };

  const saveDeck = async () => {
    if (!title.trim() || !subject.trim() || draftCards.length === 0) return;

    const newDeck: Omit<Deck, 'id' | 'created'> = {
        title: title,
        subject: subject,
        cardCount: draftCards.length,
    };

    const newCards: Omit<Card, 'id'>[] = draftCards.map((dc) => {
        // Default SRS values for new cards
        return {
            deckId: '', // Will be set by onAddDeck
            type: 'qa' as const,
            front: dc.front,
            back: dc.back,
            status: 'new' as const,
            interval: 0,
            repetitions: 0,
            easeFactor: 2.5
        };
    });

    await onAddDeck(newDeck, newCards);
    setPage('dashboard');
  };

  return (
      <div className="max-w-4xl mx-auto space-y-8">
          <div>
              <h1 className="text-3xl font-bold">Deck Builder</h1>
              <p className="text-muted-foreground">Create a custom flashcard deck manually.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                      <h3 className="font-semibold text-lg">Deck Details</h3>
                      <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
                          <input 
                             value={title} 
                             onChange={e => setTitle(e.target.value)}
                             className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
                             placeholder="e.g., React Basics"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
                          <input 
                             value={subject} 
                             onChange={e => setSubject(e.target.value)}
                             className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
                             placeholder="e.g., Programming"
                          />
                      </div>
                  </div>

                  <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                      <h3 className="font-semibold text-lg">Add Card</h3>
                      <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Question (Front)</label>
                          <textarea 
                             value={front} 
                             onChange={e => setFront(e.target.value)}
                             className="w-full bg-input border border-border rounded px-3 py-2 text-white min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white"
                             placeholder="What is a component?"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Answer (Back)</label>
                          <textarea 
                             value={back} 
                             onChange={e => setBack(e.target.value)}
                             className="w-full bg-input border border-border rounded px-3 py-2 text-white min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white"
                             placeholder="A reusable UI element..."
                          />
                      </div>
                      <button 
                        onClick={addCard}
                        disabled={!front.trim() || !back.trim()}
                        className="w-full bg-white text-black font-bold py-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                          Add Card
                      </button>
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">Cards ({draftCards.length})</h3>
                      <button 
                        onClick={saveDeck}
                        disabled={draftCards.length === 0 || !title || !subject}
                        className="bg-green-600 text-white font-bold px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:bg-muted"
                      >
                          Save Deck
                      </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {draftCards.length === 0 && (
                          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                              No cards added yet.
                          </div>
                      )}
                      {draftCards.map((card, idx) => (
                          <div key={idx} className="bg-card border border-border p-4 rounded-lg relative group">
                              <button onClick={() => removeCard(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Icons.Close size={16} />
                              </button>
                              <div className="mb-2">
                                  <span className="text-xs text-muted-foreground uppercase">Q:</span>
                                  <p className="text-sm line-clamp-2">{card.front}</p>
                              </div>
                              <div>
                                  <span className="text-xs text-muted-foreground uppercase">A:</span>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{card.back}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
  );
};

// --- PAGE: EDIT DECK ---

const EditDeckPage: React.FC<{ 
  deck: Deck, 
  cards: Card[],
  onUpdateDeck: (deckId: string, updates: Partial<Deck>) => Promise<void>,
  onUpdateCard: (cardId: string, updates: Partial<Card>) => Promise<void>,
  onDeleteCard: (cardId: string) => Promise<void>,
  onAddCards: (cards: Omit<Card, 'id'>[]) => Promise<void>,
  setPage: (p: string) => void 
}> = ({ deck, cards, onUpdateDeck, onUpdateCard, onDeleteCard, onAddCards, setPage }) => {
  const [title, setTitle] = useState(deck.title);
  const [subject, setSubject] = useState(deck.subject);
  const [existingCards, setExistingCards] = useState<Card[]>(cards);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardFront, setEditingCardFront] = useState('');
  const [editingCardBack, setEditingCardBack] = useState('');
  
  // New card inputs
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setExistingCards(cards);
  }, [cards]);

  const startEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditingCardFront(card.front);
    setEditingCardBack(card.back);
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setEditingCardFront('');
    setEditingCardBack('');
  };

  const saveEditCard = async () => {
    if (!editingCardId || !editingCardFront.trim() || !editingCardBack.trim()) return;
    
    setLoading(true);
    try {
      await onUpdateCard(editingCardId, {
        front: editingCardFront.trim(),
        back: editingCardBack.trim(),
      });
      setExistingCards(prev => prev.map(c => 
        c.id === editingCardId 
          ? { ...c, front: editingCardFront.trim(), back: editingCardBack.trim() }
          : c
      ));
      cancelEditCard();
    } catch (err) {
      setError('Failed to update card');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;
    
    setLoading(true);
    try {
      await onDeleteCard(cardId);
      setExistingCards(prev => prev.filter(c => c.id !== cardId));
    } catch (err) {
      setError('Failed to delete card');
    } finally {
      setLoading(false);
    }
  };

  const addNewCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim()) return;

    setLoading(true);
    try {
      const newCard: Omit<Card, 'id'> = {
        deckId: deck.id,
        type: 'qa' as const,
        front: newCardFront.trim(),
        back: newCardBack.trim(),
        status: 'new' as const,
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5
      };

      await onAddCards([newCard]);
      setNewCardFront('');
      setNewCardBack('');
      // Cards will be reloaded by parent component
    } catch (err) {
      setError('Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  const saveDeckChanges = async () => {
    if (!title.trim() || !subject.trim()) {
      setError('Title and subject are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onUpdateDeck(deck.id, {
        title: title.trim(),
        subject: subject.trim(),
      });
      setPage('decks');
    } catch (err) {
      setError('Failed to save deck changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Deck</h1>
          <p className="text-muted-foreground">Modify your flashcard deck.</p>
        </div>
        <button
          onClick={() => setPage('decks')}
          className="text-muted-foreground hover:text-foreground"
        >
          <Icons.Close size={24} />
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2">
          <Icons.Error size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <h3 className="font-semibold text-lg">Deck Details</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="e.g., React Basics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
              <input 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="e.g., Programming"
              />
            </div>
            <button
              onClick={saveDeckChanges}
              disabled={loading || !title.trim() || !subject.trim()}
              className="w-full bg-white text-black font-bold py-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Deck Changes'}
            </button>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <h3 className="font-semibold text-lg">Add New Card</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Question (Front)</label>
              <textarea 
                value={newCardFront} 
                onChange={e => setNewCardFront(e.target.value)}
                className="w-full bg-input border border-border rounded px-3 py-2 text-white min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="What is a component?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Answer (Back)</label>
              <textarea 
                value={newCardBack} 
                onChange={e => setNewCardBack(e.target.value)}
                className="w-full bg-input border border-border rounded px-3 py-2 text-white min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white"
                placeholder="A reusable UI element..."
              />
            </div>
            <button 
              onClick={addNewCard}
              disabled={loading || !newCardFront.trim() || !newCardBack.trim()}
              className="w-full bg-white text-black font-bold py-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Card'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Cards ({existingCards.length})</h3>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {existingCards.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                No cards in this deck.
              </div>
            )}
            {existingCards.map((card) => (
              <div key={card.id} className="bg-card border border-border p-4 rounded-lg relative group">
                {editingCardId === card.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Question</label>
                      <textarea
                        value={editingCardFront}
                        onChange={e => setEditingCardFront(e.target.value)}
                        className="w-full bg-input border border-border rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Answer</label>
                      <textarea
                        value={editingCardBack}
                        onChange={e => setEditingCardBack(e.target.value)}
                        className="w-full bg-input border border-border rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditCard}
                        disabled={loading || !editingCardFront.trim() || !editingCardBack.trim()}
                        className="flex-1 bg-green-600 text-white text-xs font-bold py-1.5 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditCard}
                        className="flex-1 bg-muted text-white text-xs font-bold py-1.5 rounded hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleDeleteCard(card.id)} 
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icons.Delete size={16} />
                    </button>
                    <button
                      onClick={() => startEditCard(card)}
                      className="absolute top-2 right-8 text-muted-foreground hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit card"
                    >
                      <Icons.Edit size={16} />
                    </button>
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground uppercase">Q:</span>
                      <p className="text-sm line-clamp-2">{card.front}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase">A:</span>
                      <p className="text-sm text-muted-foreground line-clamp-2">{card.back}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PAGE: UPLOADS ---

const UploadsPage: React.FC<{ onAddDeck: (d: Omit<Deck, 'id' | 'created'>, c: Omit<Card, 'id'>[]) => Promise<void> }> = ({ onAddDeck }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [jobs, setJobs] = useState<AIUploadJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError("File is too large (max 20MB)");
      return;
    }
    
    const newJob: AIUploadJob = {
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      status: 'processing',
      progress: 10,
      date: new Date().toLocaleDateString()
    };

    setJobs(prev => [newJob, ...prev]);
    setError(null);

    try {
        // Simulate Processing Time
        await new Promise(resolve => setTimeout(resolve, 1000));
        setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, progress: 40 } : j));

        // Call Gemini to generate based on filename/topic since we can't parse PDF reliably in pure client demo
        const topic = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        // Check if API key is configured
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured. Please add VITE_GEMINI_API_KEY to your .env file and restart the dev server.");
        }
        
        const generatedCards = await generateFlashcardsFromTopic(topic);

        if (!generatedCards || generatedCards.length === 0) {
            throw new Error("AI returned no cards. Please try again with a simpler filename or topic.");
        }
        
        // Check if we got error cards (API key issues, etc.)
        if (generatedCards.length === 1 && generatedCards[0].front.includes("Error") || generatedCards[0].front.includes("API")) {
            throw new Error(generatedCards[0].back);
        }

        setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, progress: 80 } : j));

        // Create Deck
        const newDeck: Omit<Deck, 'id' | 'created'> = {
            title: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/[-_]/g, ' '),
            subject: 'AI Generated',
            cardCount: generatedCards.length,
        };

        const newCards: Omit<Card, 'id'>[] = generatedCards.map((gc) => ({
            deckId: '', // Will be set by onAddDeck
            type: (gc.type || 'qa') as 'qa' | 'cloze',
            front: gc.front || 'Error: No Question',
            back: gc.back || 'Error: No Answer',
            status: 'new' as const,
            interval: 0,
            repetitions: 0,
            easeFactor: 2.5
        }));

        await onAddDeck(newDeck, newCards);

        setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'completed', progress: 100 } : j));

    } catch (err) {
        console.error(err);
        setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'error', progress: 0 } : j));
        setError("Failed to generate flashcards. " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Generator</h1>
        <p className="text-muted-foreground">Upload files to generate flashcard suggestions instantly.</p>
      </div>

      {/* Drag Drop Area */}
      <div 
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all ${isDragging ? 'border-white bg-muted/50' : 'border-border bg-card'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <div className="bg-muted p-4 rounded-full mb-4">
          <Icons.Upload size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Drop your PDF here</h3>
        <p className="text-muted-foreground mb-6 text-center max-w-sm">or click to browse (max 20MB)</p>
        <label className="bg-white hover:bg-gray-200 text-black font-medium px-6 py-2 rounded-lg cursor-pointer transition-colors">
          Choose File
          <input type="file" className="hidden" accept=".pdf,.txt" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <Icons.Error size={18} />
          {error}
        </div>
      )}

      {/* Recent Uploads */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Uploads</h3>
        {jobs.length === 0 && (
            <div className="text-muted-foreground italic text-sm">No uploads yet. Try dropping a file above!</div>
        )}
        {jobs.map(job => (
          <div key={job.id} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
            <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg">
              <Icons.File size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-medium truncate text-sm">{job.filename}</h4>
                <span className={`text-xs capitalize ${job.status === 'completed' ? 'text-green-500' : job.status === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {job.status}
                </span>
              </div>
              {job.status === 'processing' ? (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{job.date} • {job.status === 'completed' ? 'Deck Created' : 'Failed'}</div>
              )}
            </div>
            {job.status === 'completed' && <Icons.Check size={20} className="text-green-500" />}
            {job.status === 'error' && <Icons.Error size={20} className="text-red-500" />}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setJobs(prev => prev.filter(j => j.id !== job.id));
              }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Icons.Delete size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- PAGE: DECKS ---

const DecksPage: React.FC<{ 
  decks: Deck[], 
  onStudy: (d: Deck) => void, 
  onDelete: (id: string) => void, 
  onEdit: (d: Deck) => void,
  setPage: (p: string) => void 
}> = ({ decks, onStudy, onDelete, onEdit, setPage }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">My Decks</h1>
            <p className="text-muted-foreground">Manage your flashcard collections.</p>
        </div>
        <button 
            onClick={() => setPage('create-deck')}
            className="bg-white text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
        >
            <Icons.Plus size={18} />
            New Deck
        </button>
      </div>

      {decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Icons.Decks size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">You don't have any decks yet.</p>
              <div className="flex gap-4 mt-4">
                  <button onClick={() => setPage('create-deck')} className="text-white underline">Create Manually</button>
                  <button onClick={() => setPage('uploads')} className="text-white underline">Generate with AI</button>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => (
              <div key={deck.id} className="bg-card border border-border rounded-xl p-5 hover:border-gray-600 transition-all group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                     <button 
                       onClick={(e) => { e.stopPropagation(); onEdit(deck); }} 
                       className="text-muted-foreground hover:text-blue-400"
                       title="Edit deck"
                     >
                        <Icons.Edit size={18} />
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }} 
                       className="text-muted-foreground hover:text-destructive"
                       title="Delete deck"
                     >
                        <Icons.Delete size={18} />
                     </button>
                </div>
                <div onClick={() => onStudy(deck)} className="cursor-pointer">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-muted text-xs px-2 py-1 rounded text-muted-foreground uppercase font-bold tracking-wider truncate max-w-[150px]">{deck.subject}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 truncate">{deck.title}</h3>
                    <p className="text-muted-foreground text-sm mb-6">{deck.cardCount} cards</p>
                    <div className="flex items-center text-sm text-white font-medium group-hover:text-blue-400 transition-colors">
                        Study Now <Icons.ChevronRight size={16} className="ml-1" />
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};

// --- PAGE: STUDY ---

const StudyPage: React.FC<{ 
    deck: Deck | null, 
    cards: Card[], 
    onBack: (saveSession?: boolean) => void,
    onUpdateCard: (updatedCard: Card) => void,
    userId: string
}> = ({ deck, cards, onBack, onUpdateCard, userId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [cardsStudied, setCardsStudied] = useState(0);
  const [showConfidence, setShowConfidence] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState(0);

  if (!deck || cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold mb-2">Empty Deck</h2>
        <p className="text-muted-foreground mb-4">This deck has no cards.</p>
        <button onClick={onBack} className="bg-white text-black px-4 py-2 rounded">Go Back</button>
    </div>
  );

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  const handleAgain = () => {
    if (!currentCard) return;
    
    // Mark as "Again" - use grade 1 (Fail) for SRS
    const result = calculateSm2(
        1, // Again = Fail
        currentCard.repetitions || 0, 
        currentCard.interval || 0, 
        currentCard.easeFactor || 2.5
    );

    const nextDate = getNextReviewDate(result.interval);

    const updatedCard: Card = {
        ...currentCard,
        interval: result.interval,
        easeFactor: result.easeFactor,
        repetitions: result.repetitions,
        nextReview: nextDate,
        lastReviewed: new Date().toISOString(),
        status: 'learning' // Reset to learning
    };

    onUpdateCard(updatedCard);
    setCardsStudied(prev => prev + 1);

    // Stay on same card, just flip back
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (!currentCard) return;
    
    // Mark as "Good" - use grade 3 for SRS
    const result = calculateSm2(
        3, // Good
        currentCard.repetitions || 0, 
        currentCard.interval || 0, 
        currentCard.easeFactor || 2.5
    );

    const nextDate = getNextReviewDate(result.interval);
    
    let newStatus: Card['status'] = 'review';
    if (result.interval > 30) newStatus = 'mastered';

    const updatedCard: Card = {
        ...currentCard,
        interval: result.interval,
        easeFactor: result.easeFactor,
        repetitions: result.repetitions,
        nextReview: nextDate,
        lastReviewed: new Date().toISOString(),
        status: newStatus
    };

    onUpdateCard(updatedCard);
    setCardsStudied(prev => prev + 1);

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      // Show confidence meter before finishing
      setShowConfidence(true);
    }
  };

  // Save study session when leaving
  const saveStudySession = async (completed: boolean, confidence?: number) => {
    if (!deck) return;
    
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
    
    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          deck_id: deck.id,
          cards_studied: cardsStudied,
          duration_seconds: duration,
          confidence_rating: confidence || null,
          completed: completed,
          started_at: new Date(sessionStartTime).toISOString(),
          ended_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving study session:', error);
      }
    } catch (error) {
      console.error('Error saving study session:', error);
    }
  };

  const handleQuit = async () => {
    // Save incomplete session
    await saveStudySession(false);
    onBack();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (finished || showConfidence) return;
        if (e.code === 'Space') {
            if(!isFlipped) setIsFlipped(true);
        }
        if (isFlipped) {
            if (e.key === '1' || e.key === 'a' || e.key === 'A') handleAgain();
            if (e.key === '2' || e.key === 'n' || e.key === 'N' || e.key === 'Enter') handleNext();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, finished, showConfidence, currentIndex, currentCard]); 

  // Confidence meter screen
  if (showConfidence) {
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    const handleConfidenceSubmit = async () => {
      await saveStudySession(true, confidenceRating);
      setFinished(true);
      setShowConfidence(false);
    };

    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6 max-w-2xl mx-auto">
        <div className="bg-green-500/20 p-6 rounded-full text-green-500">
            <Icons.Check size={48} />
        </div>
        <h2 className="text-3xl font-bold">Session Complete!</h2>
        <div className="space-y-2 text-muted-foreground">
          <p>You've reviewed {cardsStudied} cards</p>
          <p>Duration: {minutes}m {seconds}s</p>
        </div>
        
        <div className="w-full space-y-4 mt-8">
          <h3 className="text-xl font-semibold">How confident do you feel about this session?</h3>
          <div className="flex gap-4 justify-center">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setConfidenceRating(rating)}
                className={`w-16 h-16 rounded-full font-bold text-lg transition-all ${
                  confidenceRating === rating
                    ? 'bg-white text-black scale-110'
                    : 'bg-muted text-muted-foreground hover:bg-gray-700'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-4">
            <span>Not confident</span>
            <span>Very confident</span>
          </div>
        </div>

        <button 
          onClick={handleConfidenceSubmit}
          disabled={confidenceRating === 0}
          className="bg-white text-black font-bold px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Finish Session
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
        <div className="bg-green-500/20 p-6 rounded-full text-green-500">
            <Icons.Check size={48} />
        </div>
        <h2 className="text-3xl font-bold">Session Complete!</h2>
        <p className="text-muted-foreground">You've reviewed {cardsStudied} cards in this deck.</p>
        <button onClick={onBack} className="bg-white text-black font-bold px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors">
            Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <button onClick={handleQuit} className="text-muted-foreground hover:text-white flex items-center gap-1">
            <Icons.Close size={20} /> Quit
        </button>
        <div className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted h-1 rounded-full mb-8">
        <div className="bg-white h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 relative perspective-1000 mb-8">
        <div 
            className={`w-full h-full cursor-pointer transition-transform duration-500 transform-style-3d relative ${isFlipped ? 'flipped' : ''}`}
            onClick={() => !isFlipped && setIsFlipped(true)}
            style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
             {/* Front */}
            <div className="absolute inset-0 bg-card border border-border rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-2xl" style={{ backfaceVisibility: 'hidden' }}>
                <span className="text-xs text-muted-foreground uppercase tracking-widest mb-4 font-semibold">Question</span>
                <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">{currentCard.front}</h2>
                <div className="absolute bottom-6 text-sm text-muted-foreground flex items-center gap-2">
                    <span className="px-2 py-1 bg-muted rounded text-xs">Space</span> to flip
                </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 bg-card border border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-2xl" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                <span className="text-xs text-blue-400 uppercase tracking-widest mb-4 font-semibold">Answer</span>
                <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">{currentCard.back}</h2>
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`h-24 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAgain(); }} 
              className="flex flex-col items-center justify-center p-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 hover:border-destructive/50 text-destructive font-bold transition-all active:scale-95"
            >
                Again
                <span className="text-xs mt-1 opacity-70">(1 or A)</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(); }} 
              className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-500 font-bold transition-all active:scale-95"
            >
                Next
                <span className="text-xs mt-1 opacity-70">(2, N, or Enter)</span>
            </button>
        </div>
      </div>
    </div>
  );
};

// --- PAGE: PROFILE ---

const ProfilePage: React.FC<{ user: User, onUpdateUser: (user: User) => void, onLogout: () => void }> = ({ user, onUpdateUser, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.profilePictureUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updates: any = {};
      
      // Update name if changed
      if (name !== user.name) {
        updates.name = name;
      }

      // Update username if changed
      if (username !== user.username) {
        if (!username || username.length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }
        
        const available = await isUsernameAvailable(username, user.id);
        if (!available) {
          setError('Username is already taken');
          setLoading(false);
          return;
        }
        updates.username = username;
      }

      // Upload profile picture if changed
      if (profilePicture) {
        const pictureUrl = await uploadProfilePicture(user.id, profilePicture);
        if (pictureUrl) {
          updates.profilePictureUrl = pictureUrl;
        }
      }

      if (Object.keys(updates).length > 0) {
        const updatedProfile = await updateProfile(user.id, updates);
        if (updatedProfile) {
          onUpdateUser(updatedProfile);
          setSuccess('Profile updated successfully!');
          setProfilePicture(null);
        } else {
          setError('Failed to update profile');
        }
      } else {
        setError('No changes to save');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>

      {/* Profile Picture Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <Icons.Profile size={48} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <label className="bg-white hover:bg-gray-200 text-black font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors inline-block">
              Upload Photo
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleProfilePictureChange}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 5MB</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Display Name</label>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Username</label>
          <input 
            value={username} 
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
            placeholder="your_username"
          />
          <p className="text-xs text-muted-foreground mt-1">Only letters, numbers, and underscores</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
          <input 
            value={user.email} 
            readOnly 
            className="w-full bg-input border border-border rounded px-3 py-2 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2">
            <Icons.Error size={16} /> {error}
          </div>
        )}

        {success && (
          <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-lg flex items-center gap-2">
            <Icons.Check size={16} /> {success}
          </div>
        )}

        <button 
          onClick={handleUpdateProfile}
          disabled={loading}
          className="bg-white text-black font-bold px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
        
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password</label>
          <input 
            type="password"
            value={currentPassword} 
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
          <input 
            type="password"
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password</label>
          <input 
            type="password"
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <button 
          onClick={handleChangePassword}
          disabled={loading}
          className="bg-secondary text-secondary-foreground font-bold px-6 py-2 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-red-500 font-semibold mb-4">Danger Zone</h3>
        <button 
          onClick={onLogout} 
          className="border border-red-900 text-red-500 px-4 py-2 rounded hover:bg-red-900/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

// --- PAGE: RESET PASSWORD (from email link) ---

const ResetPasswordPage: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      
      // Sign out after password reset so user can log in with new password
      await supabase.auth.signOut();
      
      // Clear the URL hash
      window.history.replaceState(null, '', window.location.pathname);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-green-500/20 text-green-500 p-4 rounded-full mb-4">
              <Icons.Check size={48} />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Password Reset!</h2>
            <p className="mt-2 text-muted-foreground">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="bg-white text-black p-4 rounded-2xl mb-4">
            <Icons.Logo size={48} />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
          <p className="mt-2 text-muted-foreground text-center">
            Enter your new password below.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-card border border-border p-8 rounded-xl shadow-xl space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2">
              <Icons.Error size={16} /> {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN APP CONTROLLER ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [decks, setDecks] = useState<Deck[]>(INITIAL_DECKS);
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check for existing session and load user data
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // Check if Supabase is configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.warn('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
          if (isMounted) setLoading(false);
          return;
        }

        // Handle auth callback from URL hash (email confirmation or password reset)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        // Handle password reset (recovery) flow
        if (type === 'recovery' && accessToken) {
          try {
            // Set the session from the recovery token so user can update password
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('Error setting recovery session:', sessionError);
              // Clear the hash and redirect to login
              window.history.replaceState(null, '', window.location.pathname);
              if (isMounted) {
                setLoading(false);
              }
              return;
            }
            
            // Show the reset password page
            if (isMounted) {
              setShowResetPassword(true);
              setLoading(false);
            }
            return;
          } catch (error) {
            console.error('Error handling password reset:', error);
            window.history.replaceState(null, '', window.location.pathname);
            if (isMounted) {
              setLoading(false);
            }
            return;
          }
        }
        
        // Handle email confirmation flow
        if (type === 'email' && accessToken) {
          try {
            // Exchange the access token for a session to confirm the email
            const { data: { session }, error: hashError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (hashError) {
              console.error('Error confirming email:', hashError);
            } else {
              // Email confirmed successfully - sign out to redirect to login
              await supabase.auth.signOut();
            }
          } catch (error) {
            console.error('Error handling email confirmation:', error);
          }
          
          // Clear the hash from URL and redirect to login
          window.history.replaceState(null, '', window.location.pathname);
          if (isMounted) {
            setUser(null);
            setCurrentPage('login');
            setLoading(false);
          }
          return;
        }

        // Check for existing session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as { data: { session: any }, error: any };
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) setLoading(false);
          return;
        }
        
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile && isMounted) {
            setUser(profile);
            setCurrentPage('dashboard');
            // Load user data asynchronously - don't block loading state
            loadUserData(session.user.id).catch((dataError) => {
              console.error('Error loading user data:', dataError);
              // Continue anyway - user can still use the app
            });
          } else if (!profile) {
            // No profile found - user might need to log in again
            console.warn('Profile not found for session user');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // Always set loading to false, even if there are errors
        if (isMounted) setLoading(false);
      }
    };

    initAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };

    // Listen for auth changes (only if Supabase is configured)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setDecks([]);
            setCards([]);
            setCurrentPage('login');
          } else if (event === 'SIGNED_IN' && session?.user) {
            const profile = await getProfile(session.user.id);
            if (profile) {
              setUser(profile);
              setCurrentPage('dashboard');
              await loadUserData(session.user.id);
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Load user's decks and cards from Supabase
  const loadUserData = async (userId: string) => {
    try {
      // Use Promise.allSettled to ensure both calls complete even if one fails
      const results = await Promise.allSettled([
        getDecks(userId),
        getCardsByUser(userId),
      ]);
      
      const userDecks = results[0].status === 'fulfilled' ? results[0].value : [];
      const userCards = results[1].status === 'fulfilled' ? results[1].value : [];
      
      if (results[0].status === 'rejected') {
        console.error('Error loading decks:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.error('Error loading cards:', results[1].reason);
      }
      
      setDecks(userDecks || []);
      setCards(userCards || []);
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set empty arrays on error so app can still function
      setDecks([]);
      setCards([]);
    }
  };

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentPage('dashboard');
    await loadUserData(loggedInUser.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDecks([]);
    setCards([]);
    setCurrentPage('login');
  };

  const handleAddDeck = async (newDeck: Omit<Deck, 'id' | 'created'>, newCards: Omit<Card, 'id'>[]) => {
    if (!user) return;

    try {
      // Create deck in Supabase
      const createdDeck = await createDeck(user.id, newDeck);
      if (!createdDeck) {
        console.error('Failed to create deck');
        return;
      }

      // Create cards in Supabase
      const cardsWithDeckId = newCards.map(card => ({
        ...card,
        deckId: createdDeck.id,
      }));
      const createdCards = await createCards(cardsWithDeckId);

      // Update deck card count
      await updateDeckCardCount(createdDeck.id);

      // Update local state
      setDecks(prev => [createdDeck, ...prev]);
      setCards(prev => [...createdCards, ...prev]);
    } catch (error) {
      console.error('Error adding deck:', error);
    }
  };

  const handleDeleteDeck = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this deck?")) return;

    try {
      const success = await deleteDeck(id);
      if (success) {
        setDecks(prev => prev.filter(d => d.id !== id));
        setCards(prev => prev.filter(c => c.deckId !== id));
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };

  const handleStartStudy = (deck: Deck) => {
    setActiveDeck(deck);
    setCurrentPage('study');
  };

  const handleBackFromStudy = async () => {
    if (activeDeck && user) {
      // Update last studied timestamp
      await updateDeck(activeDeck.id, { lastStudied: new Date().toISOString() });
      // Reload decks to get updated timestamp
      await loadUserData(user.id);
    }
    setActiveDeck(null);
    setCurrentPage('dashboard');
  };

  const handleUpdateCard = async (updatedCard: Card) => {
    try {
      const savedCard = await updateCard(updatedCard.id, updatedCard);
      if (savedCard) {
        setCards(prev => prev.map(c => c.id === updatedCard.id ? savedCard : c));
      }
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const handleEditDeck = async (deck: Deck) => {
    setEditingDeck(deck);
    // Reload cards for this deck to ensure we have the latest data
    const deckCards = await getCards(deck.id);
    setCards(prev => {
      // Remove old cards for this deck and add new ones
      const otherCards = prev.filter(c => c.deckId !== deck.id);
      return [...otherCards, ...deckCards];
    });
    setCurrentPage('edit-deck');
  };

  const handleUpdateDeck = async (deckId: string, updates: Partial<Deck>) => {
    try {
      const updatedDeck = await updateDeck(deckId, updates);
      if (updatedDeck) {
        setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
        if (editingDeck?.id === deckId) {
          setEditingDeck(updatedDeck);
        }
      }
    } catch (error) {
      console.error('Error updating deck:', error);
      throw error;
    }
  };

  const handleUpdateCardInEdit = async (cardId: string, updates: Partial<Card>) => {
    try {
      const savedCard = await updateCard(cardId, updates);
      if (savedCard) {
        setCards(prev => prev.map(c => c.id === cardId ? savedCard : c));
      }
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  };

  const handleDeleteCardInEdit = async (cardId: string) => {
    try {
      const success = await deleteCard(cardId);
      if (success) {
        setCards(prev => prev.filter(c => c.id !== cardId));
        if (editingDeck) {
          await updateDeckCardCount(editingDeck.id);
          // Reload deck to get updated card count
          const updatedDeck = await getDecks(user!.id).then(decks => decks.find(d => d.id === editingDeck.id));
          if (updatedDeck) {
            setEditingDeck(updatedDeck);
            setDecks(prev => prev.map(d => d.id === editingDeck.id ? updatedDeck : d));
          }
        }
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  };

  const handleAddCardsToDeck = async (newCards: Omit<Card, 'id'>[]) => {
    try {
      const createdCards = await createCards(newCards);
      setCards(prev => [...createdCards, ...prev]);
      if (editingDeck) {
        await updateDeckCardCount(editingDeck.id);
        // Reload deck to get updated card count
        const updatedDeck = await getDecks(user!.id).then(decks => decks.find(d => d.id === editingDeck.id));
        if (updatedDeck) {
          setEditingDeck(updatedDeck);
          setDecks(prev => prev.map(d => d.id === editingDeck.id ? updatedDeck : d));
        }
        // Reload cards for the deck to ensure we have all cards
        const deckCards = await getCards(editingDeck.id);
        setCards(prev => {
          const otherCards = prev.filter(c => c.deckId !== editingDeck.id);
          return [...otherCards, ...deckCards];
        });
      }
    } catch (error) {
      console.error('Error adding cards:', error);
      throw error;
    }
  };

  // Routing logic
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Icons.Spinner size={32} className="animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if Supabase is configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

  // Show reset password page if user came from recovery email
  if (showResetPassword) {
    return (
      <ResetPasswordPage 
        onComplete={() => {
          setShowResetPassword(false);
          setUser(null);
          setCurrentPage('login');
        }} 
      />
    );
  }

  if (!user) {
    return (
      <>
        {!isSupabaseConfigured && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500/20 border-b border-yellow-500/50 text-yellow-400 px-4 py-3 text-sm z-50">
            <div className="max-w-6xl mx-auto flex items-center gap-2">
              <Icons.Error size={18} />
              <span>
                Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
                See SUPABASE_SETUP.md for instructions.
              </span>
            </div>
          </div>
        )}
        <AuthPage onLogin={handleLogin} />
      </>
    );
  }

  if (currentPage === 'study' && activeDeck && user) {
    const deckCards = cards.filter(c => c.deckId === activeDeck.id);
    return (
        <Layout page="study" setPage={setCurrentPage} user={user} handleLogout={handleLogout}>
            <StudyPage 
                deck={activeDeck} 
                cards={deckCards} 
                onBack={handleBackFromStudy} 
                onUpdateCard={handleUpdateCard}
                userId={user.id}
            />
        </Layout>
    );
  }

  return (
    <Layout page={currentPage} setPage={setCurrentPage} user={user} handleLogout={handleLogout}>
      {currentPage === 'dashboard' && (
        <Dashboard decks={decks} user={user} setPage={setCurrentPage} onStudy={handleStartStudy} />
      )}
      {currentPage === 'uploads' && (
        <UploadsPage onAddDeck={handleAddDeck} />
      )}
      {currentPage === 'create-deck' && (
        <DeckBuilderPage onAddDeck={handleAddDeck} setPage={setCurrentPage} />
      )}
      {currentPage === 'decks' && (
        <DecksPage decks={decks} onStudy={handleStartStudy} onDelete={handleDeleteDeck} onEdit={handleEditDeck} setPage={setCurrentPage} />
      )}
      {currentPage === 'edit-deck' && editingDeck && user && (
        <EditDeckPage
          deck={editingDeck}
          cards={cards.filter(c => c.deckId === editingDeck.id)}
          onUpdateDeck={handleUpdateDeck}
          onUpdateCard={handleUpdateCardInEdit}
          onDeleteCard={handleDeleteCardInEdit}
          onAddCards={handleAddCardsToDeck}
          setPage={(page) => {
            setCurrentPage(page);
            if (page !== 'edit-deck') {
              setEditingDeck(null);
            }
          }}
        />
      )}
      {currentPage === 'profile' && (
          <ProfilePage user={user} onUpdateUser={setUser} onLogout={handleLogout} />
      )}
    </Layout>
  );
};

export default App;