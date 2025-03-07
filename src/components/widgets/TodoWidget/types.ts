import { WidgetProps } from '@/types';

/**
 * Todo item interface
 * 
 * @interface TodoItem
 * @property {string} id - Unique identifier for the todo item
 * @property {string} text - The content of the todo item
 * @property {boolean} completed - Whether the todo item is completed
 * @property {Date} createdAt - When the todo item was created
 */
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

/**
 * Configuration options for the Todo widget
 * 
 * @interface TodoWidgetConfig
 * @property {string} [title] - Title for the todo list
 * @property {TodoItem[]} [items] - List of todo items
 * @property {string} [backgroundColor] - Background color for the todo list in light mode
 * @property {string} [darkBackgroundColor] - Background color for the todo list in dark mode
 * @property {boolean} [showCompletedItems] - Whether to show completed items
 * @property {string} [sortOrder] - How to sort todo items ("created" | "alphabetical" | "completed")
 */
export interface TodoWidgetConfig {
  title?: string;
  items?: TodoItem[];
  backgroundColor?: string;
  darkBackgroundColor?: string;
  showCompletedItems?: boolean;
  sortOrder?: 'created' | 'alphabetical' | 'completed';
  onUpdate?: (config: TodoWidgetConfig) => void;
  onDelete?: () => void;
}

/**
 * Props for the Todo widget component
 * 
 * @type TodoWidgetProps
 */
export type TodoWidgetProps = WidgetProps<TodoWidgetConfig>; 