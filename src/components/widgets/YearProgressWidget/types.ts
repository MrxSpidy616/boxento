import { WidgetProps } from '@/types';

/**
 * Configuration options for the Year Progress widget
 * 
 * @interface YearProgressConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {boolean} [showPercentage] - Whether to show the percentage of year completed
 * @property {boolean} [showDaysLeft] - Whether to show the number of days left
 */
export interface YearProgressConfig {
  id?: string;
  showPercentage?: boolean;
  showDaysLeft?: boolean;
  onUpdate?: (config: YearProgressConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

/**
 * Props for the Year Progress widget component
 * 
 * @type YearProgressProps
 */
export type YearProgressProps = WidgetProps<YearProgressConfig>; 