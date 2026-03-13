import { WidgetProps } from '@/types';

/**
 * Interface for the highlight data from Readwise API
 * 
 * @interface ReadwiseHighlight
 * @property {number} id - Unique identifier for the highlight
 * @property {string} text - The text content of the highlight
 * @property {string} note - Any notes or annotations associated with the highlight
 * @property {number} location - The location of the highlight in the source text
 * @property {string} location_type - The type of location (e.g., 'order', 'page', 'time_offset')
 * @property {string | null} highlighted_at - When the highlight was created
 * @property {string | null} url - URL associated with the highlight
 * @property {string} color - Color coding for the highlight
 * @property {string} updated - When the highlight was last updated
 * @property {number} book_id - ID of the source book/article
 * @property {string} [book_title] - Title of the source book/article
 * @property {string} [book_author] - Author of the source book/article
 * @property {Array<{id: number, name: string}>} tags - Tags associated with the highlight
 */
export interface ReadwiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string | null;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  book_title?: string;
  book_author?: string;
  tags: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * Configuration options for the Readwise widget
 * 
 * @interface ReadwiseWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {string} [title] - Title for the widget header
 * @property {string} [apiToken] - Readwise API token for authentication
 * @property {number} [refreshInterval] - How often to refresh highlights (in minutes)
 * @property {boolean} [showBookInfo] - Whether to display book title and author
 * @property {boolean} [showTags] - Whether to display tags associated with highlights
 * @property {function} [onUpdate] - Callback for updating widget configuration
 * @property {function} [onDelete] - Callback for deleting the widget
 */
export interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category: string;
  num_highlights: number;
  cover_image_url?: string;
  source_url?: string;
}

export interface ReadwiseWidgetConfig {
  id?: string;
  title?: string;
  apiToken?: string;
  refreshInterval?: number;
  showBookInfo?: boolean;
  showTags?: boolean;
  onUpdate?: (config: ReadwiseWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the Readwise widget component
 * 
 * @type ReadwiseWidgetProps
 */
export type ReadwiseWidgetProps = WidgetProps<ReadwiseWidgetConfig>; 