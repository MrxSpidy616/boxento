import { WidgetProps } from '@/types';

/**
 * Represents a timezone item in the World Clocks widget
 * 
 * @interface TimezoneItem
 * @property {number} id - Unique identifier for the timezone
 * @property {string} name - Display name for the timezone
 * @property {string} timezone - IANA timezone identifier (e.g., 'America/New_York')
 */
export interface TimezoneItem {
  id: number;
  name: string;
  timezone: string;
}

/**
 * Represents a new timezone item being created
 * 
 * @interface NewTimezoneItem
 * @property {string} name - Display name for the timezone
 * @property {string} timezone - IANA timezone identifier (e.g., 'America/New_York')
 */
export interface NewTimezoneItem {
  name: string;
  timezone: string;
}

/**
 * Configuration options for the World Clocks widget
 * 
 * @interface WorldClocksWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {TimezoneItem[]} [timezones] - Array of timezone items
 * @property {() => void} [onDelete] - Callback to delete the widget
 * @property {(config: WorldClocksWidgetConfig) => void} [onUpdate] - Callback to update widget configuration
 * @property {boolean} [readOnly] - When true, hides settings gear and suppresses editing UI
 */
export interface WorldClocksWidgetConfig {
  id?: string;
  timezones?: TimezoneItem[];
  onDelete?: () => void;
  onUpdate?: (config: WorldClocksWidgetConfig) => void;
  readOnly?: boolean;
  [key: string]: unknown; // Index signature to satisfy Record<string, unknown>
}

/**
 * Props for the World Clocks widget component
 * 
 * @type WorldClocksWidgetProps
 */
export type WorldClocksWidgetProps = WidgetProps<WorldClocksWidgetConfig>; 