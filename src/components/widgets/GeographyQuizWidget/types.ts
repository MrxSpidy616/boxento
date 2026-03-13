import { WidgetProps } from '@/types';

/**
 * Question difficulty levels
 */
export enum QuizDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

/**
 * Geography question types
 */
export enum QuestionType {
  CAPITALS = 'capitals',
  FLAGS = 'flags',
  BORDERS = 'borders',
  LANDMARKS = 'landmarks',
  MIXED = 'mixed'
}

/**
 * Single quiz question
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  image?: string;
  type: QuestionType;
}

/**
 * A single completed quiz round result for history/leaderboard
 */
export interface QuizRound {
  id: string;
  score: number;
  total: number;
  date: string;
  difficulty: QuizDifficulty;
  category: QuestionType;
}

/**
 * Configuration options for the Geography Quiz widget
 */
export interface GeographyQuizWidgetConfig {
  id?: string;
  title?: string;
  difficulty?: QuizDifficulty;
  questionType?: QuestionType;
  questionsPerRound?: number;
  history?: QuizRound[];
  onUpdate?: (config: GeographyQuizWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the Geography Quiz widget component
 */
export type GeographyQuizWidgetProps = WidgetProps<GeographyQuizWidgetConfig>;
