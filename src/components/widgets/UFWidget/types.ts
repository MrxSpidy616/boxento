import { WidgetProps } from '@/types';

/**
 * Configuration options for the UF Widget
 * 
 * @interface UFWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {string} [title] - Title to display in the widget header
 * @property {boolean} [showHistory] - Whether to show historical data
 * @property {number} [refreshInterval] - Refresh interval in minutes (default: 60)
 */
export interface UFWidgetConfig {
  id?: string;
  title?: string;
  showHistory?: boolean;
  refreshInterval?: number;
  onUpdate?: (config: UFWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the UF Widget component
 * 
 * @type UFWidgetProps
 */
export type UFWidgetProps = WidgetProps<UFWidgetConfig>;

/**
 * UF Data structure from mindicador.cl API
 */
export interface UFData {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  fecha: string;
  valor: number;
  serie: UFSerieItem[];
}

/**
 * UF Serie Item structure for historical data
 */
export interface UFSerieItem {
  fecha: string;
  valor: number;
} 