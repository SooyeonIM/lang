export interface Idiom {
  id: number;
  phrase: string;
  meaning: string;
  literal: string;
  example: string;
}

export type AppMode = 'home' | 'quiz_practice' | 'quiz_challenge' | 'dictionary';

export interface QuizQuestion {
  idiom: Idiom;
  options: string[]; // 4 Korean meanings
  correctAnswerIndex: number;
}

export interface QuizHistoryItem {
  idiom: Idiom;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface UserStats {
  timesPracticePlayed: number;
  timesChallengePlayed: number;
  challengeHighScore: number;
  correctCount: number;
  incorrectCount: number;
  learnedIdiomIds: number[]; // those that are marked read or correctly answered recently
  bookmarkedIdiomIds: number[];
}
