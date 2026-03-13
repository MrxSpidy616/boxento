import { WidgetProps } from '@/types';

export interface QRCodeHistoryItem {
  id: string;
  content: string;
  label?: string;
  createdAt: string;
}

export interface QRCodeWidgetConfig {
  id?: string;
  title?: string;
  content?: string; // Text or URL to encode
  fgColor?: string; // Foreground (dot) color
  bgColor?: string; // Background color
  errorLevel?: 'L' | 'M' | 'Q' | 'H';
  history?: QRCodeHistoryItem[];
  onUpdate?: (config: QRCodeWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type QRCodeWidgetProps = WidgetProps<QRCodeWidgetConfig>;
