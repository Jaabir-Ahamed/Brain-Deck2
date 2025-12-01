export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  profilePictureUrl?: string;
}

export type CardType = 'qa' | 'cloze';

export interface Card {
  id: string;
  deckId: string;
  type: CardType;
  front: string;
  back: string;
  lastReviewed?: string;
  nextReview?: string;
  interval?: number; // in days
  easeFactor?: number;
  repetitions?: number; // consecutive successful reviews
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  cardCount: number;
  created: string;
  lastStudied?: string;
}

export interface AIUploadJob {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  date: string;
}

export interface GeminiCard {
  front: string;
  back: string;
  type: CardType;
}