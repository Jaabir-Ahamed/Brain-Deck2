import { supabase } from './supabase';
import { User, Deck, Card } from '../types';

// Profile operations
export const getProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    // Check if it's a "not found" error or a permissions error
    if (error.code === 'PGRST116') {
      // No rows returned - profile doesn't exist
      console.warn('Profile not found for user:', userId);
    } else if (error.code === '42501') {
      // Permission denied - RLS issue
      console.error('Permission denied - RLS policy issue or migration not run');
    }
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    username: data.username,
    profilePictureUrl: data.profile_picture_url,
  };
};

export const updateProfile = async (userId: string, updates: { name?: string; username?: string; profilePictureUrl?: string }): Promise<User | null> => {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.username !== undefined) updateData.username = updates.username;
  if (updates.profilePictureUrl !== undefined) updateData.profile_picture_url = updates.profilePictureUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    username: data.username,
    profilePictureUrl: data.profile_picture_url,
  };
};

// Get user email by username (for login)
// Uses a database function to bypass RLS policies (needed for login when user is not authenticated)
export const getUserEmailByUsername = async (username: string): Promise<string | null> => {
  try {
    console.log('Looking up email for username:', username);
    // Use the RPC function that bypasses RLS
    const { data, error } = await supabase.rpc('get_user_email_by_username', {
      username_param: username
    });

    if (error) {
      console.error('Error getting user email by username:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status: error.status
      });
      
      // If function doesn't exist or permission denied
      if (error.status === 401 || error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('JWT')) {
        console.error('Permission error - function may not have GRANT EXECUTE. Run: GRANT EXECUTE ON FUNCTION public.get_user_email_by_username(TEXT) TO anon;');
        return null;
      }
      
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist') || error.code === 'PGRST116') {
        console.error('Function not found - migration may not have been run');
        return null;
      }
      
      return null;
    }

    // The function returns a table, so data is an array
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Found email for username:', data[0].email);
      return data[0].email;
    }
    
    console.log('No user found with username:', username);
    return null;
  } catch (error) {
    console.error('Error in getUserEmailByUsername:', error);
    return null;
  }
};

// Check if username is available
// Uses a database function to bypass RLS policies (needed for signup when user is not authenticated)
export const isUsernameAvailable = async (username: string, excludeUserId?: string): Promise<boolean> => {
  try {
    console.log('Checking username availability for:', username);
    const { data, error } = await supabase.rpc('is_username_available', {
      username_param: username,
      exclude_user_id: excludeUserId || null
    });

    if (error) {
      console.error('Error checking username availability:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status: error.status
      });
      
      // 401 Unauthorized - permission issue
      if (error.status === 401 || error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('JWT')) {
        throw new Error('Permission denied. Please run this SQL in Supabase SQL Editor:\n\nGRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO anon;\n\nThen refresh the page and try again.');
      }
      
      // If the function doesn't exist
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist') || error.code === 'PGRST116') {
        throw new Error('Database function not found. Please run the migration in Supabase SQL Editor: supabase/migrations/002_add_username_and_profile_picture.sql');
      }
      
      // For other errors, throw with details
      throw new Error(`Database error: ${error.message || error.code || 'Unknown error'}. Please check your Supabase configuration.`);
    }

    console.log('Username availability result:', data);
    // The function returns a boolean
    return data === true;
  } catch (error: any) {
    // Re-throw all errors so UI can show them
    throw error;
  }
};

// Deck operations
export const getDecks = async (userId: string): Promise<Deck[]> => {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching decks:', error);
    return [];
  }

  return data.map(deck => ({
    id: deck.id,
    title: deck.title,
    subject: deck.subject,
    cardCount: deck.card_count,
    created: deck.created_at,
    lastStudied: deck.last_studied,
  }));
};

export const createDeck = async (userId: string, deck: Omit<Deck, 'id' | 'created'>): Promise<Deck | null> => {
  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: userId,
      title: deck.title,
      subject: deck.subject,
      card_count: deck.cardCount,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating deck:', error);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    cardCount: data.card_count,
    created: data.created_at,
    lastStudied: data.last_studied,
  };
};

export const updateDeck = async (deckId: string, updates: Partial<Deck>): Promise<Deck | null> => {
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.subject !== undefined) updateData.subject = updates.subject;
  if (updates.cardCount !== undefined) updateData.card_count = updates.cardCount;
  if (updates.lastStudied !== undefined) updateData.last_studied = updates.lastStudied;

  const { data, error } = await supabase
    .from('decks')
    .update(updateData)
    .eq('id', deckId)
    .select()
    .single();

  if (error) {
    console.error('Error updating deck:', error);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    cardCount: data.card_count,
    created: data.created_at,
    lastStudied: data.last_studied,
  };
};

export const deleteDeck = async (deckId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId);

  if (error) {
    console.error('Error deleting deck:', error);
    return false;
  }

  return true;
};

// Card operations
export const getCards = async (deckId: string): Promise<Card[]> => {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching cards:', error);
    return [];
  }

  return data.map(card => ({
    id: card.id,
    deckId: card.deck_id,
    type: card.type as 'qa' | 'cloze',
    front: card.front,
    back: card.back,
    status: card.status as Card['status'],
    interval: card.interval,
    easeFactor: card.ease_factor,
    repetitions: card.repetitions,
    lastReviewed: card.last_reviewed,
    nextReview: card.next_review,
  }));
};

export const getCardsByUser = async (userId: string): Promise<Card[]> => {
  // Get all user's decks first
  const userDecks = await getDecks(userId);
  if (userDecks.length === 0) return [];

  // Get all cards for those decks
  const deckIds = userDecks.map(d => d.id);
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .in('deck_id', deckIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching user cards:', error);
    return [];
  }

  return data.map(card => ({
    id: card.id,
    deckId: card.deck_id,
    type: card.type as 'qa' | 'cloze',
    front: card.front,
    back: card.back,
    status: card.status as Card['status'],
    interval: card.interval,
    easeFactor: card.ease_factor,
    repetitions: card.repetitions,
    lastReviewed: card.last_reviewed,
    nextReview: card.next_review,
  }));
};

export const createCards = async (cards: Omit<Card, 'id'>[]): Promise<Card[]> => {
  const cardsToInsert = cards.map(card => ({
    deck_id: card.deckId,
    type: card.type,
    front: card.front,
    back: card.back,
    status: card.status,
    interval: card.interval ?? 0,
    ease_factor: card.easeFactor ?? 2.5,
    repetitions: card.repetitions ?? 0,
    last_reviewed: card.lastReviewed,
    next_review: card.nextReview,
  }));

  const { data, error } = await supabase
    .from('cards')
    .insert(cardsToInsert)
    .select();

  if (error) {
    console.error('Error creating cards:', error);
    return [];
  }

  return data.map(card => ({
    id: card.id,
    deckId: card.deck_id,
    type: card.type as 'qa' | 'cloze',
    front: card.front,
    back: card.back,
    status: card.status as Card['status'],
    interval: card.interval,
    easeFactor: card.ease_factor,
    repetitions: card.repetitions,
    lastReviewed: card.last_reviewed,
    nextReview: card.next_review,
  }));
};

export const updateCard = async (cardId: string, updates: Partial<Card>): Promise<Card | null> => {
  const updateData: any = {};
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.front !== undefined) updateData.front = updates.front;
  if (updates.back !== undefined) updateData.back = updates.back;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.interval !== undefined) updateData.interval = updates.interval;
  if (updates.easeFactor !== undefined) updateData.ease_factor = updates.easeFactor;
  if (updates.repetitions !== undefined) updateData.repetitions = updates.repetitions;
  if (updates.lastReviewed !== undefined) updateData.last_reviewed = updates.lastReviewed;
  if (updates.nextReview !== undefined) updateData.next_review = updates.nextReview;

  const { data, error } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', cardId)
    .select()
    .single();

  if (error) {
    console.error('Error updating card:', error);
    return null;
  }

  return {
    id: data.id,
    deckId: data.deck_id,
    type: data.type as 'qa' | 'cloze',
    front: data.front,
    back: data.back,
    status: data.status as Card['status'],
    interval: data.interval,
    easeFactor: data.ease_factor,
    repetitions: data.repetitions,
    lastReviewed: data.last_reviewed,
    nextReview: data.next_review,
  };
};

export const deleteCard = async (cardId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId);

  if (error) {
    console.error('Error deleting card:', error);
    return false;
  }

  return true;
};

export const updateDeckCardCount = async (deckId: string): Promise<void> => {
  const { count, error: countError } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', deckId);

  if (countError) {
    console.error('Error counting cards:', countError);
    return;
  }

  await supabase
    .from('decks')
    .update({ card_count: count ?? 0 })
    .eq('id', deckId);
};

// Study session operations
export interface StudySession {
  id: string;
  userId: string;
  deckId: string;
  cardsStudied: number;
  durationSeconds: number;
  confidenceRating?: number;
  completed: boolean;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export const getStudySessions = async (userId: string, limit: number = 7): Promise<StudySession[]> => {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching study sessions:', error);
    return [];
  }

  return data.map(session => ({
    id: session.id,
    userId: session.user_id,
    deckId: session.deck_id,
    cardsStudied: session.cards_studied,
    durationSeconds: session.duration_seconds,
    confidenceRating: session.confidence_rating,
    completed: session.completed,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    createdAt: session.created_at,
  }));
};

export const getWeeklyActivity = async (userId: string): Promise<{ date: string; cards: number; sessions: number; totalDuration: number }[]> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', sevenDaysAgo.toISOString())
    .order('started_at', { ascending: true });

  if (error) {
    console.error('Error fetching weekly activity:', error);
    return [];
  }

  // Group by date
  const activityByDate: { [key: string]: { cards: number; sessions: number; totalDuration: number } } = {};
  
  data.forEach(session => {
    const date = new Date(session.started_at).toLocaleDateString('en-US', { weekday: 'short' });
    if (!activityByDate[date]) {
      activityByDate[date] = { cards: 0, sessions: 0, totalDuration: 0 };
    }
    activityByDate[date].cards += session.cards_studied;
    activityByDate[date].sessions += 1;
    activityByDate[date].totalDuration += session.duration_seconds;
  });

  // Get last 7 days
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    date: day,
    cards: activityByDate[day]?.cards || 0,
    sessions: activityByDate[day]?.sessions || 0,
    totalDuration: activityByDate[day]?.totalDuration || 0,
  }));
};

