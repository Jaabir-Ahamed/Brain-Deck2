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
  };
};

export const updateProfile = async (userId: string, updates: { name?: string }): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
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
  };
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

