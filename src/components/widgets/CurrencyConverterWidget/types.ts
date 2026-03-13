import { WidgetProps } from '@/types';

/**
 * Configuration options for the Currency Converter widget
 * 
 * @interface CurrencyConverterWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {string} [title] - Title to display in the widget header
 * @property {string} [apiKey] - Open Exchange Rates API key
 * @property {boolean} [useSharedCredential] - Whether to use shared API key
 * @property {string} [baseCurrency] - Base currency for conversion
 * @property {string[]} [targetCurrencies] - List of target currencies to display
 * @property {boolean} [autoRefresh] - Whether to automatically refresh rates
 * @property {number} [refreshInterval] - Interval in minutes for auto-refresh
 */
export interface CurrencyConverterWidgetConfig extends Record<string, unknown> {
  id?: string;
  title?: string;
  apiKey?: string;
  useSharedCredential?: boolean;
  baseCurrency?: string;
  targetCurrencies?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  onUpdate?: (config: CurrencyConverterWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

/**
 * Props for the Currency Converter widget component
 * 
 * @type CurrencyConverterWidgetProps
 */
export type CurrencyConverterWidgetProps = WidgetProps<CurrencyConverterWidgetConfig>;

/**
 * Data structure for currency conversion results
 * 
 * @interface ConversionData
 */
export interface ConversionData {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  value: string;
} 