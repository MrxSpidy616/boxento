import { WidgetProps } from '@/types';

/**
 * Configuration options for the Iframe widget
 *
 * @interface IframeWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {string} [title] - Title to display in the widget header
 * @property {string} [url] - URL to display in the iframe
 * @property {number} [scale] - Scale factor for iframe content (0.5 - 2.0)
 * @property {'top' | 'center' | 'bottom'} [alignment] - Vertical alignment
 * @property {boolean} [readOnly] - Disable editing in shared/public mode
 */
export interface IframeWidgetConfig {
  id?: string;
  title?: string;
  url?: string;
  scale?: number;
  alignment?: 'top' | 'center' | 'bottom';
  onUpdate?: (config: IframeWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the Iframe widget component
 *
 * @type IframeWidgetProps
 */
export type IframeWidgetProps = WidgetProps<IframeWidgetConfig>;
