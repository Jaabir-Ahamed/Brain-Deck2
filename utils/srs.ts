export interface SRSResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
}

/**
 * Calculates the next scheduling parameters using the SM-2 algorithm.
 * 
 * @param grade The user's grade (1: Again, 2: Hard, 3: Good, 4: Easy)
 * @param existingRepetitions Number of successful consecutive repetitions
 * @param existingInterval Current interval in days
 * @param existingEaseFactor Current ease factor (default 2.5)
 */
export const calculateSm2 = (
  grade: number,
  existingRepetitions: number = 0,
  existingInterval: number = 0,
  existingEaseFactor: number = 2.5
): SRSResult => {
  // Map BrainDeck grades (1-4) to SM-2 quality (0-5)
  // 1: Again (Fail) -> 0
  // 2: Hard (Pass)  -> 3
  // 3: Good (Pass)  -> 4
  // 4: Easy (Pass)  -> 5
  
  let quality = 0;
  if (grade === 1) quality = 0;
  else if (grade === 2) quality = 3;
  else if (grade === 3) quality = 4;
  else if (grade === 4) quality = 5;

  // Calculate new Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEaseFactor = existingEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ease Factor cannot go below 1.3
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newRepetitions = existingRepetitions;
  let newInterval = existingInterval;

  if (quality < 3) {
    // If quality is less than 3 (Fail), start repetitions over
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions += 1;
    
    // Interval calculation
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(existingInterval * newEaseFactor);
    }
  }

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions
  };
};

export const getNextReviewDate = (intervalDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + intervalDays);
  return date.toISOString();
};

export const formatInterval = (days: number): string => {
    if (days === 1) return '1d';
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.round(days / 30)}mo`;
    return `${Math.round(days / 365)}y`;
};
