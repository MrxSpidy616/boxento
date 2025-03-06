import { WidgetProps } from '@/types';

/**
 * Represents a link item in the QuickLinks widget
 * 
 * @interface LinkItem
 * @property {number} id - Unique identifier for the link
 * @property {string} title - Display name of the link
 * @property {string} url - URL the link points to
 * @property {string} color - Color associated with the link (hex code)
 */
export interface LinkItem {
  id: number;
  title: string;
  url: string;
  color: string;
}

/**
 * Configuration options for the QuickLinks widget
 * 
 * @interface QuickLinksWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {LinkItem[]} [links] - Array of link items
 */
export interface QuickLinksWidgetConfig {
  id?: string;
  links?: LinkItem[];
}

/**
 * Props for the QuickLinks widget component
 * 
 * @type QuickLinksWidgetProps
 */
export type QuickLinksWidgetProps = WidgetProps<QuickLinksWidgetConfig>; 