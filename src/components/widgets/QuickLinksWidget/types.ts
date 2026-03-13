import { WidgetProps } from '@/types';

/**
 * Represents a link item in the QuickLinks widget
 * 
 * @interface LinkItem
 * @property {number} id - Unique identifier for the link
 * @property {string} title - Display name of the link
 * @property {string} url - URL the link points to
 * @property {string} favicon - URL to the favicon of the link
 */
export interface LinkItem {
  id: number;
  url: string;
  title: string;
  favicon: string;
  category?: string;
}

/**
 * Configuration options for the QuickLinks widget
 * 
 * @interface QuickLinksWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {LinkItem[]} [links] - Array of link items
 * @property {string} [customTitle] - Custom title for the widget
 * @property {'regular' | 'compact'} [displayMode] - Display mode for the links
 * @property {boolean} [showFavicons] - Whether to show favicons for links
 * @property {() => void} [onDelete] - Callback to delete the widget
 * @property {(config: QuickLinksWidgetConfig) => void} [onUpdate] - Callback to update widget configuration
 */
export interface QuickLinksWidgetConfig {
  id?: string;
  links: LinkItem[];
  customTitle?: string;
  displayMode?: 'regular' | 'compact';
  showFavicons?: boolean;
  onDelete?: () => void;
  onUpdate?: (config: QuickLinksWidgetConfig) => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the QuickLinks widget component
 * 
 * @type QuickLinksWidgetProps
 */
export type QuickLinksWidgetProps = WidgetProps<QuickLinksWidgetConfig>; 