import { WidgetProps } from '@/types';

export interface CountdownEvent {
  id: string;
  name: string;
  targetDate: string; // ISO date string
  color?: string;
  showTime?: boolean;
}

export interface CountdownWidgetConfig {
  id?: string;
  title?: string;
  targetDate?: string; // ISO date string (primary countdown)
  eventName?: string;
  showTime?: boolean; // Show hours/minutes/seconds
  events?: CountdownEvent[]; // Multiple countdowns for app mode
  onUpdate?: (config: CountdownWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type CountdownWidgetProps = WidgetProps<CountdownWidgetConfig>;

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalMs: number;
}
