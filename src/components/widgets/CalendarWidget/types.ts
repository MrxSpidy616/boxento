import { WidgetProps } from '@/types';

/**
 * Represents a calendar event
 * 
 * @interface CalendarEvent
 * @property {number | string} [id] - Optional unique identifier for the event
 * @property {string} title - Title of the event
 * @property {Date | string} [start] - Start date/time of the event
 * @property {Date | string} [end] - End date/time of the event
 * @property {boolean} [allDay] - Whether the event is an all-day event
 * @property {string} [location] - Location of the event
 * @property {string} [description] - Description of the event
 * @property {string} [color] - Color associated with the event
 * @property {string} [time] - Time of the event as a string
 */
export interface CalendarEvent {
  id?: number | string;
  title: string;
  start?: Date | string;
  end?: Date | string;
  allDay?: boolean;
  location?: string;
  description?: string;
  color?: string;
  time?: string;
}

/**
 * Represents a calendar connected to the widget
 * 
 * @interface CalendarSource
 * @property {string} id - Unique identifier for the calendar
 * @property {string} name - Display name of the calendar
 * @property {string} color - Color associated with the calendar
 * @property {boolean} selected - Whether the calendar is selected for display
 */
export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  selected: boolean;
}

/**
 * Configuration options for the Calendar widget
 * 
 * @interface CalendarWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {CalendarEvent[]} [events] - Array of calendar events
 * @property {'day' | 'week' | 'month'} [defaultView] - Default view mode
 * @property {'sunday' | 'monday'} [startDay] - First day of the week
 * @property {boolean} [showWeekNumbers] - Whether to show week numbers
 * @property {boolean} [googleCalendarConnected] - Whether Google Calendar is connected
 * @property {CalendarSource[]} [calendars] - Connected calendar sources
 */
export interface CalendarWidgetConfig {
  id?: string;
  events?: CalendarEvent[];
  defaultView?: 'day' | 'week' | 'month';
  viewMode?: 'month' | 'week' | 'day';
  startDay?: 'sunday' | 'monday';
  showWeekNumbers?: boolean;
  googleCalendarConnected?: boolean;
  calendars?: CalendarSource[];
  onUpdate?: (config: CalendarWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown; // Index signature to satisfy Record<string, unknown>
}

/**
 * Props for the Calendar widget component
 * 
 * @type CalendarWidgetProps
 */
export type CalendarWidgetProps = WidgetProps<CalendarWidgetConfig>; 