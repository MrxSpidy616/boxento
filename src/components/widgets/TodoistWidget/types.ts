import { WidgetProps } from '@/types';

/**
 * Represents a Todoist task
 */
export interface TodoistTask {
  id: string;
  content: string;
  completed: boolean;
  due?: {
    date: string;
    string: string;
  };
  priority: number;
  project_id: string;
  url: string;
  description?: string;
  labels?: string[];
  section_id?: string;
}

/**
 * Represents a Todoist project
 */
export interface TodoistProject {
  id: string;
  name: string;
  color: string;
  order: number;
}

/**
 * Configuration options for the Todoist widget
 */
export interface TodoistWidgetConfig {
  id?: string;
  title?: string;
  apiToken?: string;
  projectId?: string;
  showCompleted?: boolean;
  maxTasks?: number;
  onUpdate?: (config: TodoistWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the Todoist widget component
 */
export type TodoistWidgetProps = WidgetProps<TodoistWidgetConfig>;
