import { WidgetProps } from '@/types';

export interface ReaderDocument {
  id: string;
  url: string;
  source_url: string;
  title: string;
  author: string | null;
  source: string | null;
  category: 'article' | 'email' | 'rss' | 'highlight' | 'note' | 'pdf' | 'epub' | 'tweet' | 'video';
  location: 'new' | 'later' | 'shortlist' | 'archive' | 'feed';
  tags: Record<string, unknown>;
  site_name: string | null;
  word_count: number | null;
  reading_progress: number;
  summary: string | null;
  image_url: string | null;
  published_date: string | null;
  created_at: string;
  updated_at: string;
  saved_at: string;
  html_content?: string | null;
}

export interface ReaderWidgetConfig {
  id?: string;
  title?: string;
  apiToken?: string;
  refreshInterval?: number;
  location?: 'new' | 'later' | 'shortlist' | 'archive' | 'feed' | 'all';
  contentType?: 'article' | 'email' | 'rss' | 'pdf' | 'epub' | 'tweet' | 'video' | 'all';
  showImage?: boolean;
  showSummary?: boolean;
  showProgress?: boolean;
  readOnly?: boolean;
  onDelete?: () => void;
  onUpdate?: (config: ReaderWidgetConfig) => void;
  [key: string]: unknown;
}

export type ReaderWidgetProps = WidgetProps<ReaderWidgetConfig>;
