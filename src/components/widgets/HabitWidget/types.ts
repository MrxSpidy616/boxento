import { WidgetProps } from '@/types';

/**
 * Individual habit with completion history
 */
export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  completedDates: string[]; // Array of ISO date strings (YYYY-MM-DD)
}

/**
 * Configuration options for the Habit widget
 */
export interface HabitWidgetConfig {
  id?: string;
  title?: string;
  habits?: Habit[];
  onUpdate?: (config: HabitWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the Habit widget component
 */
export type HabitWidgetProps = WidgetProps<HabitWidgetConfig>;
