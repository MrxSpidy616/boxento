import { WidgetProps } from '@/types';

export interface TrackedFlight {
  id: string;
  flightNumber: string;
  flightDate: string;
  label?: string;
}

export interface FlightTrackerWidgetConfig {
  id?: string;
  title?: string;
  flightNumber?: string;
  flightDate?: string;
  trackedFlights?: TrackedFlight[];
  refreshInterval?: number;
  onUpdate?: (config: FlightTrackerWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type FlightTrackerWidgetProps = WidgetProps<FlightTrackerWidgetConfig>;
