import React, { useState, useEffect } from 'react';
import { Icons } from './components/Icons';
import { User, Deck, Card, AIUploadJob } from './types';
import { generateFlashcardsFromTopic } from './services/geminiService';
import { calculateSm2, getNextReviewDate, formatInterval } from './utils/srs';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from './src/lib/supabase';
import { getProfile, getDecks, createDeck, updateDeck, deleteDeck, getCardsByUser, createCards, updateCard, updateDeckCardCount } from './src/lib/db';

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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        if (!name) {
          setError('Name is required for sign up');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        
        // Sign up with Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
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
                });
              }
            } catch (err: any) {
              console.error('Error in profile creation fallback:', err);
              setError('Account created but profile not found. The database migration may not have been run. Please check SUPABASE_SETUP.md and try logging in.');
            }
          }
        }
      } else {
        // Sign in with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
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
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-muted-foreground text-center">
            {mode === 'login' 
              ? 'Sign in to continue your learning journey.' 
              : 'Start your journey with BrainDeck today.'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-card border border-border p-8 rounded-xl shadow-xl space-y-6">
          {mode === 'signup' && (
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
          )}
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:ring-2 focus:ring-white focus:outline-none transition-all"
              placeholder="you@example.com"
            />
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
            {loading ? 'Loading...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-white font-medium cursor-pointer hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- PAGE: DASHBOARD ---

const Dashboard: React.FC<{ decks: Deck[], user: User, setPage: (p: string) => void, onStudy: (d: Deck) => void }> = ({ decks, user, setPage, onStudy }) => {
  const data = [
    { name: 'Mon', cards: 0 },
    { name: 'Tue', cards: 0 },
    { name: 'Wed', cards: 0 },
    { name: 'Thu', cards: 0 },
    { name: 'Fri', cards: 0 },
    { name: 'Sat', cards: 0 },
    { name: 'Sun', cards: 0 },
  ];

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
          <h3 className="text-lg font-semibold mb-6">Activity</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#27272a'}}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="cards" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={'#3f3f46'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">Start studying to see your stats!</p>
        </div>
      </div>
    </div>
  );
};

// --- PAGE: DECK BUILDER (MANUAL) ---

const DeckBuilderPage: React.FC<{ onAddDeck: (d: Omit<Deck, 'id' | 'created'>, c: Omit<Card, 'id'>[]) => Promise<void>, setPage: (p: string) => void }> = ({ onAddDeck, setPage }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [draftCards, setDraftCards] = useState<{front: string, back: string, difficulty: 'Easy' | 'Medium' | 'Hard'}[]>([]);
  
  // Current card inputs
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const addCard = () => {
    if (!front.trim() || !back.trim()) return;
    setDraftCards([...draftCards, { front, back, difficulty }]);
    setFront('');
    setBack('');
    setDifficulty('Medium');
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
        // Preset SRS values based on initial difficulty selection
        let interval = 0;
        let easeFactor = 2.5;
        let repetitions = 0;
        let status: Card['status'] = 'new';

        if (dc.difficulty === 'Easy') {
            interval = 4;
            repetitions = 1;
            easeFactor = 2.7;
            status = 'learning'; // Slightly advanced
        } else if (dc.difficulty === 'Medium') {
            interval = 1;
            repetitions = 0;
            easeFactor = 2.5;
        } else { // Hard
            interval = 0;
            repetitions = 0;
            easeFactor = 2.3;
        }

        return {
            deckId: '', // Will be set by onAddDeck
            type: 'qa' as const,
            front: dc.front,
            back: dc.back,
            status: status,
            interval: interval,
            repetitions: repetitions,
            easeFactor: easeFactor
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
                      <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Initial Difficulty</label>
                          <select 
                            value={difficulty} 
                            onChange={(e) => setDifficulty(e.target.value as any)}
                            className="w-full bg-input border border-border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
                          >
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">Sets how soon this card appears for review.</p>
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
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                      card.difficulty === 'Easy' ? 'bg-green-900 text-green-300' : 
                                      card.difficulty === 'Hard' ? 'bg-orange-900 text-orange-300' : 
                                      'bg-blue-900 text-blue-300'
                                  }`}>
                                      {card.difficulty}
                                  </span>
                              </div>
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

const DecksPage: React.FC<{ decks: Deck[], onStudy: (d: Deck) => void, onDelete: (id: string) => void, setPage: (p: string) => void }> = ({ decks, onStudy, onDelete, setPage }) => {
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
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }} className="text-muted-foreground hover:text-destructive">
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
    onBack: () => void,
    onUpdateCard: (updatedCard: Card) => void
}> = ({ deck, cards, onBack, onUpdateCard }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  if (!deck || cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold mb-2">Empty Deck</h2>
        <p className="text-muted-foreground mb-4">This deck has no cards.</p>
        <button onClick={onBack} className="bg-white text-black px-4 py-2 rounded">Go Back</button>
    </div>
  );

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  const handleGrade = (grade: number) => {
    if (!currentCard) return;

    // Map buttons to grades
    // Btn 1 (Again) -> Grade 1 (Fail)
    // Btn 2 (Easy) -> Grade 4 (Easy) - Requested order
    // Btn 3 (Medium) -> Grade 3 (Good)
    // Btn 4 (Hard) -> Grade 2 (Hard)

    let srsGrade = 1;
    if (grade === 1) srsGrade = 1; // Again
    if (grade === 2) srsGrade = 4; // Easy
    if (grade === 3) srsGrade = 3; // Medium
    if (grade === 4) srsGrade = 2; // Hard

    const result = calculateSm2(
        srsGrade, 
        currentCard.repetitions || 0, 
        currentCard.interval || 0, 
        currentCard.easeFactor || 2.5
    );

    const nextDate = getNextReviewDate(result.interval);
    
    let newStatus: Card['status'] = 'review';
    if (result.interval > 30) newStatus = 'mastered';
    if (srsGrade === 1) newStatus = 'learning';

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

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      setFinished(true);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (finished) return;
        if (e.code === 'Space') {
            if(!isFlipped) setIsFlipped(true);
        }
        if (isFlipped) {
            if (e.key === '1') handleGrade(1); // Again
            if (e.key === '2') handleGrade(2); // Easy
            if (e.key === '3') handleGrade(3); // Medium
            if (e.key === '4') handleGrade(4); // Hard
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, finished, currentIndex, currentCard]); 

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
        <div className="bg-green-500/20 p-6 rounded-full text-green-500">
            <Icons.Check size={48} />
        </div>
        <h2 className="text-3xl font-bold">Session Complete!</h2>
        <p className="text-muted-foreground">You've reviewed all {cards.length} cards in this deck.</p>
        <button onClick={onBack} className="bg-white text-black font-bold px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors">
            Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-white flex items-center gap-1">
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
        <div className="grid grid-cols-4 gap-4">
            <button onClick={(e) => { e.stopPropagation(); handleGrade(1); }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 hover:border-destructive/50 text-destructive font-bold transition-all active:scale-95">
                Again
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleGrade(2); }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-500 font-bold transition-all active:scale-95">
                Easy
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleGrade(3); }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-500 font-bold transition-all active:scale-95">
                Medium
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleGrade(4); }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 text-orange-500 font-bold transition-all active:scale-95">
                Hard
            </button>
        </div>
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
  const [loading, setLoading] = useState(true);

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

  if (currentPage === 'study' && activeDeck) {
    const deckCards = cards.filter(c => c.deckId === activeDeck.id);
    return (
        <Layout page="study" setPage={setCurrentPage} user={user} handleLogout={handleLogout}>
            <StudyPage 
                deck={activeDeck} 
                cards={deckCards} 
                onBack={handleBackFromStudy} 
                onUpdateCard={handleUpdateCard} 
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
        <DecksPage decks={decks} onStudy={handleStartStudy} onDelete={handleDeleteDeck} setPage={setCurrentPage} />
      )}
      {currentPage === 'profile' && (
          <div className="max-w-2xl">
              <h1 className="text-3xl font-bold mb-6">Profile</h1>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Display Name</label>
                      <input value={user.name} readOnly className="w-full bg-input border border-border rounded px-3 py-2 text-white" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                      <input value={user.email} readOnly className="w-full bg-input border border-border rounded px-3 py-2 text-muted-foreground" />
                  </div>
                  <div className="pt-4 border-t border-border">
                      <h4 className="text-red-500 font-medium mb-2">Danger Zone</h4>
                      <button onClick={handleLogout} className="border border-red-900 text-red-500 px-4 py-2 rounded hover:bg-red-900/20">Sign Out</button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;