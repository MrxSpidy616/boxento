import { WidgetProps } from '@/types';

export interface GitHubStreakWidgetConfig {
  id?: string;
  title?: string;
  username?: string;
  showContributionGraph?: boolean;
  daysToShow?: number;
  personalAccessToken?: string;
  onUpdate?: (config: GitHubStreakWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type GitHubStreakWidgetProps = WidgetProps<GitHubStreakWidgetConfig>; 