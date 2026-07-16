import { WidgetProps } from '@/types';

/**
 * TMDB search result
 */
export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  vote_average: number;
  genre_ids?: number[];
  popularity?: number;
}

/**
 * Riven media item from the API
 */
export interface RivenItem {
  _id: string;
  title: string;
  type: 'movie' | 'show';
  imdb_id?: string;
  tvdb_id?: number;
  tmdb_id?: string;
  state: string;
  scraped_at?: string;
  updated_at?: string;
  requested_at?: string;
  requested_by?: string;
}

/**
 * Riven stats from the API
 */
export interface RivenStats {
  total_items: number;
  total_movies: number;
  total_shows: number;
  states: Record<string, number>;
}

/**
 * Configuration options for the Riven widget
 */
export interface RivenWidgetConfig {
  id?: string;
  title?: string;
  baseUrl?: string; // Riven frontend URL
  apiUrl?: string; // Riven backend API URL
  apiKey?: string; // Riven API key
  tmdbToken?: string; // Optional custom TMDB token (defaults to Riven's public token)
  onUpdate?: (config: RivenWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the Riven widget component
 */
export type RivenWidgetProps = WidgetProps<RivenWidgetConfig>;
