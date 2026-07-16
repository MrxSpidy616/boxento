import { WidgetProps } from '@/types';

export interface YouTubeWidgetConfig {
  id?: string;
  title?: string;
  videoId?: string;
  autoplay?: boolean;
  showControls?: boolean;
  mute?: boolean;
  onUpdate?: (config: YouTubeWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type YouTubeWidgetProps = WidgetProps<YouTubeWidgetConfig>;
