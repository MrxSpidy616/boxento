import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import {
  Check,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  ListTodo,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Pencil,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import WidgetHeader from '../common/WidgetHeader';
import { TodoWidgetProps, TodoWidgetConfig, TodoItem } from './types';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

/**
 * Todo Widget Component
 *
 * A widget for managing a todo list that adapts to any size on the
 * icon -> micro-widget -> widget -> panel -> app spectrum.
 *
 * @param {TodoWidgetProps} props - Component props
 * @returns {JSX.Element} Widget component
 */
const TodoWidget: React.FC<TodoWidgetProps> = ({ width, height, config }) => {
  const defaultConfig: TodoWidgetConfig = {
    title: 'Todo List',
    items: [],
    backgroundColor: '#FFFFFF',
    showCompletedItems: true,
    sortOrder: 'created'
  };

  // --- Size detection (icon → widget → app spectrum) ---
  const isTiny = width === 1 && height === 1;
  const isShort = height === 1 && width > 1;
  const isCompact = width <= 2 || height <= 2;
  const isWide = width >= 4;
  const isTall = height >= 4;
  const isApp = width >= 6 && height >= 6;
  const readOnly = config?.readOnly ?? false;

  const [localConfig, setLocalConfig] = useState<TodoWidgetConfig>({
    ...defaultConfig,
    ...config
  });

  const [showSettings, setShowSettings] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [draggedItem, setDraggedItem] = useState<TodoItem | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragDirection, setDragDirection] = useState<'up' | 'down' | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showCompletedSection, setShowCompletedSection] = useState(true);
  const newTodoInputRef = useRef<HTMLInputElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Update local config when props change
  useEffect(() => {
    setLocalConfig(prevConfig => ({
      ...prevConfig,
      ...config
    }));
  }, [config]);

  const addTodo = () => {
    if (!newTodoText.trim()) return;

    // Get current items and determine the highest sort order
    const currentItems = localConfig.items || [];
    const maxSortOrder = currentItems.length > 0
      ? Math.max(...currentItems.map(item => item.sortOrder || 0))
      : -1;

    // Generate a unique ID using timestamp and random number for broader compatibility
    const newTodoId = 'todo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    const newTodo: TodoItem = {
      id: newTodoId,
      text: newTodoText.trim(),
      completed: false,
      createdAt: new Date(),
      sortOrder: maxSortOrder + 1
    };

    const updatedItems = [...currentItems, newTodo];

    setLocalConfig(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Save to parent config
    if (config?.onUpdate) {
      config.onUpdate({
        ...localConfig,
        items: updatedItems
      });
    }

    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    const updatedItems = (localConfig.items || []).map(item => {
      if (item.id === id) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    setLocalConfig(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Save to parent config
    if (config?.onUpdate) {
      config.onUpdate({
        ...localConfig,
        items: updatedItems
      });
    }
  };

  const deleteTodo = (id: string) => {
    const updatedItems = (localConfig.items || []).filter(item => item.id !== id);

    setLocalConfig(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Save to parent config
    if (config?.onUpdate) {
      config.onUpdate({
        ...localConfig,
        items: updatedItems
      });
    }
  };

  const updateTodoText = (id: string, newText: string) => {
    if (!newText.trim()) return;
    const updatedItems = (localConfig.items || []).map(item => {
      if (item.id === id) {
        return { ...item, text: newText.trim() };
      }
      return item;
    });

    setLocalConfig(prev => ({
      ...prev,
      items: updatedItems
    }));

    if (config?.onUpdate) {
      config.onUpdate({
        ...localConfig,
        items: updatedItems
      });
    }

    setEditingItemId(null);
    setEditingText('');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalConfig(prev => ({
      ...prev,
      title: newTitle
    }));
  };

  const handleShowCompletedChange = (checked: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      showCompletedItems: checked
    }));
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, item: TodoItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    // Add some transparency to the dragged item
    if (e.currentTarget) {
      setTimeout(() => {
        e.currentTarget.style.opacity = '0.5';
      }, 0);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    setDraggedItem(null);
    setDragOverItemId(null);
    setDragDirection(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, overItem: TodoItem) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === overItem.id) {
      setDragOverItemId(null);
      return false;
    }

    e.dataTransfer.dropEffect = 'move';

    // Get mouse position relative to the item
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const threshold = rect.height / 2;

    // Set direction based on mouse position and item position
    if (mouseY < threshold) {
      setDragDirection('up'); // Drop above the item
    } else {
      setDragDirection('down'); // Drop below the item
    }

    setDragOverItemId(overItem.id);

    return false;
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetItem: TodoItem) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetItem.id) return;

    // Get current items
    const items = [...(localConfig.items || [])];

    // Find indices
    const draggedIndex = items.findIndex(item => item.id === draggedItem.id);
    const targetIndex = items.findIndex(item => item.id === targetItem.id);

    if (draggedIndex < 0 || targetIndex < 0) return;

    // Remove the dragged item
    const [removed] = items.splice(draggedIndex, 1);

    // Calculate the new index based on direction
    let newIndex = targetIndex;

    // If we're dragging down and the dragged item is before the target,
    // we need to adjust the target index
    if (dragDirection === 'down' && draggedIndex < targetIndex) {
      newIndex = targetIndex - 1;
    }

    // If we're dragging up and the dragged item is after the target,
    // we don't need to adjust
    if (dragDirection === 'up' && draggedIndex > targetIndex) {
      newIndex = targetIndex;
    }

    // If we're dragging up and the dragged item is before the target,
    // we need to insert after the target
    if (dragDirection === 'up' && draggedIndex < targetIndex) {
      newIndex = targetIndex - 1;
    }

    // If we're dragging down and the dragged item is after the target,
    // we need to insert after the target
    if (dragDirection === 'down' && draggedIndex > targetIndex) {
      newIndex = targetIndex + 1;
    }

    // Insert at new position
    items.splice(newIndex, 0, removed);

    // Update sort orders
    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index
    }));

    // Reset drag state
    setDragOverItemId(null);
    setDragDirection(null);

    // Update to manual sort order if not already set
    const updatedConfig = {
      ...localConfig,
      items: updatedItems,
      sortOrder: 'manual' as const
    };

    // Update local state
    setLocalConfig(updatedConfig);

    // Update parent state
    if (config?.onUpdate) {
      config.onUpdate(updatedConfig);
    }
  };

  const getDropZoneClass = (itemId: string) => {
    if (draggedItem && dragOverItemId === itemId) {
      if (dragDirection === 'up') {
        return 'border-t-2 border-blue-500';
      } else if (dragDirection === 'down') {
        return 'border-b-2 border-blue-500';
      }
    }
    return '';
  };

  const handleSortOrderChange = (value: 'created' | 'alphabetical' | 'completed' | 'manual') => {
    setLocalConfig(prev => ({
      ...prev,
      sortOrder: value
    }));
  };

  const saveSettings = () => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  };

  const getFilteredAndSortedItems = () => {
    let items = [...(localConfig.items || [])];

    // Filter out completed items if needed
    if (!localConfig.showCompletedItems) {
      items = items.filter(item => !item.completed);
    }

    // Sort items
    switch (localConfig.sortOrder) {
      case 'alphabetical':
        items.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'completed':
        items.sort((a, b) => {
          if (a.completed === b.completed) {
            return 0;
          }
          return a.completed ? 1 : -1;
        });
        break;
      case 'manual':
        items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        break;
      case 'created':
      default:
        items.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });
        break;
    }

    return items;
  };

  const getPendingCount = () => {
    return (localConfig.items || []).filter(item => !item.completed).length;
  };

  const getCompletedCount = () => {
    return (localConfig.items || []).filter(item => item.completed).length;
  };

  // ─── 1x1 ICON: Pending count as large number ────────────────────────
  const renderTinyView = () => {
    const pendingCount = getPendingCount();
    const allDone = (localConfig.items || []).length > 0 && pendingCount === 0;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-0.5 text-center">
        {allDone ? (
          <>
            <CheckCircle2 size={24} className="text-green-500" />
            <div className="text-[9px] font-medium text-green-600 dark:text-green-400">Done</div>
          </>
        ) : (
          <>
            <div className="text-[2rem] font-bold leading-none text-gray-900 dark:text-gray-100">
              {pendingCount}
            </div>
            <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
              {pendingCount === 1 ? 'task' : 'tasks'}
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── Nx1 RIBBON: Count badge + next pending todo titles as chips ────
  const renderRibbonView = () => {
    const pendingCount = getPendingCount();
    const pendingItems = (localConfig.items || [])
      .filter(item => !item.completed)
      .slice(0, Math.max(2, width - 1));

    return (
      <div className="flex h-full items-center gap-2 overflow-x-auto px-1">
        {/* Count badge */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex flex-col items-center rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5">
            <span className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">{pendingCount}</span>
            <span className="text-[9px] text-gray-500 dark:text-gray-400">to do</span>
          </div>
        </div>

        {/* Todo chips */}
        {pendingItems.length > 0 ? (
          pendingItems.map((item) => (
            <div
              key={item.id}
              className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-700 px-2.5 py-1"
            >
              {!readOnly && (
                <button
                  onClick={() => toggleTodo(item.id)}
                  className="h-3 w-3 shrink-0 rounded-full border border-gray-300 dark:border-gray-500 hover:border-green-400 transition-colors"
                  aria-label="Mark as complete"
                />
              )}
              <span className="max-w-[120px] truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                {item.text}
              </span>
            </div>
          ))
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">All done!</span>
        )}
      </div>
    );
  };

  // ─── 2x2 Compact: Pending count + tight list ─────────────────────────
  const renderCompactView = () => {
    const items = getFilteredAndSortedItems();
    const pendingCount = getPendingCount();
    // Show fewer items in 2x2 to leave room for add form
    const visibleItems = items.slice(0, height <= 2 ? 3 : 4);

    return (
      <div className="h-full flex flex-col">
        {/* Pending count header */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{pendingCount}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">pending</span>
        </div>
        <div className="flex-grow overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 dark:text-gray-400">
              <p>No tasks</p>
            </div>
          ) : (
            <div className="space-y-0.5 pr-1">
              {visibleItems.map(item => (
                <li
                  key={item.id}
                  draggable={!readOnly}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDrop={(e) => handleDrop(e, item)}
                  className={`flex items-center p-1 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 dark:hover:bg-opacity-50 transition-all relative text-gray-800 dark:text-gray-100 group cursor-grab active:cursor-grabbing ${getDropZoneClass(item.id)}`}
                >
                  <button
                    onClick={() => !readOnly && toggleTodo(item.id)}
                    className={`flex-shrink-0 w-3 h-3 rounded-full border ${
                      item.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    } flex items-center justify-center mr-1.5`}
                    aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
                    disabled={readOnly}
                  >
                    {item.completed && <Check size={8} />}
                  </button>
                  <span className={`text-xs font-medium flex-grow truncate ${
                    item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
                  }`}>
                    {item.text}
                  </span>
                  {!readOnly && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        onClick={() => deleteTodo(item.id)}
                        className="p-0.5 text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                        aria-label="Delete task"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {items.length > visibleItems.length && (
                <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-0.5">
                  +{items.length - visibleItems.length} more
                </div>
              )}
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
            <form
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                if (newTodoText.trim()) {
                  addTodo();
                }
              }}
              className="flex items-center gap-1"
            >
              <Input
                ref={newTodoInputRef}
                type="text"
                value={newTodoText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTodoText(e.target.value)}
                placeholder="Add task..."
                className="flex-grow text-xs h-7"
              />
              <button
                type="submit"
                disabled={!newTodoText.trim()}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  const renderTodoList = (items: TodoItem[]) => (
    <div className="space-y-2 pr-1">
      {items.map(item => (
        <li
          key={item.id}
          draggable={!readOnly}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, item)}
          onDrop={(e) => handleDrop(e, item)}
          className={`flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 dark:hover:bg-opacity-50 rounded-lg transition-all relative text-gray-800 dark:text-gray-100 group cursor-grab active:cursor-grabbing ${getDropZoneClass(item.id)}`}
        >
          {!readOnly && (
            <div className="flex-shrink-0 mr-0.5 text-gray-300 dark:text-gray-700 group-hover:text-gray-400 dark:group-hover:text-gray-600 transition-colors">
              <GripVertical size={14} />
            </div>
          )}

          <button
            onClick={() => !readOnly && toggleTodo(item.id)}
            className={`flex-shrink-0 w-5 h-5 rounded-full border ${
              item.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 dark:border-gray-600'
            } flex items-center justify-center`}
            aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
            disabled={readOnly}
          >
            {item.completed && <Check size={12} />}
          </button>

          <span
            className={`flex-grow truncate ${
              item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
            }`}
          >
            {item.text}
          </span>

          {!readOnly && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => deleteTodo(item.id)}
                className="p-1 text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                aria-label="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </li>
      ))}
    </div>
  );

  const renderAddTodoForm = () => {
    if (readOnly) return null;
    return (
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          if (newTodoText.trim()) {
            addTodo();
          }
        }}
        className="flex items-center gap-2"
      >
        <Input
          ref={newTodoInputRef}
          type="text"
          value={newTodoText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTodoText(e.target.value)}
          placeholder="Add task..."
          className="flex-grow"
          aria-label="New task"
        />
        <button
          type="submit"
          disabled={!newTodoText.trim()}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          aria-label="Add task"
        >
          <Plus size={20} />
        </button>
      </form>
    );
  };

  // ─── 3x3 Default View ─────────────────────────────────────────────────
  const renderDefaultView = () => {
    const items = getFilteredAndSortedItems();
    return (
      <div className="h-full flex flex-col">
        <div className="flex-grow overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No tasks</p>
            </div>
          ) : (
            renderTodoList(items)
          )}
        </div>
        {!readOnly && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {renderAddTodoForm()}
          </div>
        )}
      </div>
    );
  };

  // ─── Wide View (4x2, 4x3, 5x3 etc.) ──────────────────────────────────
  const renderWideView = () => {
    const items = getFilteredAndSortedItems();
    return (
      <div className="h-full grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium mb-2">Tasks</h3>
          <div className="flex-grow overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No tasks</p>
              </div>
            ) : (
              renderTodoList(items)
            )}
          </div>
        </div>
        <div className="flex flex-col">
          {renderAddTodoForm()}
        </div>
      </div>
    );
  };

  // ─── Tall View (3x4, 3x5 etc.) ────────────────────────────────────────
  const renderTallView = () => {
    const items = getFilteredAndSortedItems();
    return (
      <div className="h-full flex flex-col">
        <div className="flex-grow overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No tasks</p>
            </div>
          ) : (
            renderTodoList(items)
          )}
        </div>
        {!readOnly && (
          <div className="mt-4">
            {renderAddTodoForm()}
          </div>
        )}
      </div>
    );
  };

  // ─── 4x4-5x5 Panel: Two-column layout ─────────────────────────────────
  const renderLargeView = () => {
    const items = getFilteredAndSortedItems();
    const completedItems = items.filter(item => item.completed);
    const pendingItems = items.filter(item => !item.completed);

    return (
      <div className="h-full grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium mb-2">Pending Tasks ({pendingItems.length})</h3>
          <div className="flex-grow overflow-y-auto">
            {pendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No pending tasks</p>
              </div>
            ) : (
              renderTodoList(pendingItems)
            )}
          </div>
          {!readOnly && (
            <div className="mt-4">
              {renderAddTodoForm()}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm font-medium mb-2">Completed Tasks ({completedItems.length})</h3>
          <div className="flex-grow overflow-y-auto">
            {completedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No completed tasks</p>
              </div>
            ) : (
              renderTodoList(completedItems)
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── 6x6+ App: Full task manager ──────────────────────────────────────
  const renderAppView = () => {
    const allItems = [...(localConfig.items || [])];
    const pendingCount = getPendingCount();
    const completedCount = getCompletedCount();
    const totalCount = allItems.length;

    // Sort items according to current sort order
    const sortItems = (items: TodoItem[]) => {
      const sorted = [...items];
      switch (localConfig.sortOrder) {
        case 'alphabetical':
          sorted.sort((a, b) => a.text.localeCompare(b.text));
          break;
        case 'completed':
          sorted.sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
          });
          break;
        case 'manual':
          sorted.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          break;
        case 'created':
        default:
          sorted.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          });
          break;
      }
      return sorted;
    };

    // Filter items based on app filter
    let filteredPending: TodoItem[];
    let filteredCompleted: TodoItem[];

    if (appFilter === 'pending') {
      filteredPending = sortItems(allItems.filter(i => !i.completed));
      filteredCompleted = [];
    } else if (appFilter === 'completed') {
      filteredPending = [];
      filteredCompleted = sortItems(allItems.filter(i => i.completed));
    } else {
      filteredPending = sortItems(allItems.filter(i => !i.completed));
      filteredCompleted = sortItems(allItems.filter(i => i.completed));
    }

    const formatDate = (date: Date | string) => {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    };

    const filterTabs: { key: 'all' | 'pending' | 'completed'; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: totalCount },
      { key: 'pending', label: 'Pending', count: pendingCount },
      { key: 'completed', label: 'Completed', count: completedCount },
    ];

    const renderAppTodoItem = (item: TodoItem) => (
      <li
        key={item.id}
        draggable={!readOnly}
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, item)}
        onDrop={(e) => handleDrop(e, item)}
        onDoubleClick={() => {
          if (!readOnly) {
            setEditingItemId(item.id);
            setEditingText(item.text);
          }
        }}
        className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-all group cursor-grab active:cursor-grabbing ${getDropZoneClass(item.id)}`}
      >
        {!readOnly && (
          <div className="flex-shrink-0 text-gray-300 dark:text-gray-700 group-hover:text-gray-400 dark:group-hover:text-gray-600 transition-colors">
            <GripVertical size={14} />
          </div>
        )}

        <button
          onClick={() => !readOnly && toggleTodo(item.id)}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
            item.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
          } flex items-center justify-center`}
          aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
          disabled={readOnly}
        >
          {item.completed && <Check size={12} />}
        </button>

        {editingItemId === item.id ? (
          <form
            className="flex-grow flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateTodoText(item.id, editingText);
            }}
          >
            <Input
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => updateTodoText(item.id, editingText)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingItemId(null);
                  setEditingText('');
                }
              }}
              className="flex-grow text-sm h-8"
            />
          </form>
        ) : (
          <span
            className={`flex-grow truncate text-sm ${
              item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'
            }`}
          >
            {item.text}
          </span>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {formatDate(item.createdAt)}
        </span>

        {!readOnly && editingItemId !== item.id && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setEditingItemId(item.id);
                setEditingText(item.text);
              }}
              className="p-1 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
              aria-label="Edit task"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => deleteTodo(item.id)}
              className="p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </li>
    );

    return (
      <div className="h-full flex">
        {/* Left sidebar - Filter tabs */}
        <div className="w-1/3 max-w-[200px] border-r border-gray-200 dark:border-gray-700 flex flex-col p-3">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo size={18} className="text-gray-700 dark:text-gray-200" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
              {localConfig.title || defaultConfig.title}
            </h2>
          </div>

          <nav className="space-y-1 flex-grow">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAppFilter(tab.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  appFilter === tab.key
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${
                  appFilter === tab.key
                    ? 'bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>

          {/* Sort controls */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpDown size={12} className="text-gray-400 dark:text-gray-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by</span>
            </div>
            <Select
              value={localConfig.sortOrder || 'created'}
              onValueChange={(value: 'created' | 'alphabetical' | 'completed' | 'manual') => {
                const updatedConfig = { ...localConfig, sortOrder: value };
                setLocalConfig(updatedConfig);
                if (config?.onUpdate) {
                  config.onUpdate(updatedConfig);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="completed">Completion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 p-4">
          {/* Add todo form at top */}
          {!readOnly && (
            <div className="mb-4">
              <form
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  if (newTodoText.trim()) {
                    addTodo();
                  }
                }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={newTodoInputRef}
                  type="text"
                  value={newTodoText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTodoText(e.target.value)}
                  placeholder="Add a new task..."
                  className="flex-grow"
                  aria-label="New task"
                />
                <Button
                  type="submit"
                  disabled={!newTodoText.trim()}
                  size="sm"
                  variant="default"
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </form>
            </div>
          )}

          {/* Todo list */}
          <div className="flex-grow overflow-y-auto">
            {filteredPending.length === 0 && filteredCompleted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <ListTodo size={32} className="mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  {appFilter === 'completed' ? 'No completed tasks' : appFilter === 'pending' ? 'No pending tasks' : 'No tasks yet'}
                </p>
                {!readOnly && appFilter !== 'completed' && (
                  <p className="text-xs mt-1">Add a task above to get started</p>
                )}
              </div>
            ) : (
              <div>
                {/* Pending items */}
                {filteredPending.length > 0 && (
                  <ul className="space-y-1">
                    {filteredPending.map(renderAppTodoItem)}
                  </ul>
                )}

                {/* Completed items (collapsible) */}
                {filteredCompleted.length > 0 && appFilter !== 'pending' && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowCompletedSection(!showCompletedSection)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 transition-colors"
                    >
                      {showCompletedSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>Completed ({filteredCompleted.length})</span>
                    </button>
                    {showCompletedSection && (
                      <ul className="space-y-1">
                        {filteredCompleted.map(renderAppTodoItem)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Content router (full spectrum) ────────────────────────────────────
  const renderContent = () => {
    if (isTiny) return renderTinyView();
    if (isShort) return renderRibbonView();
    if (isApp) return renderAppView();
    if (isWide && isTall) return renderLargeView();
    if (isWide) return renderWideView();
    if (isTall) return renderTallView();
    if (isCompact) return renderCompactView();
    return renderDefaultView();
  };

  // ─── Settings modal ───────────────────────────────────────────────────
  const renderSettings = () => {
    return (
      <Dialog
        open={showSettings}
        onOpenChange={(open: boolean) => {
          if (!open) {
            // Reset to original config when closing without save
            if (config) {
              setLocalConfig(prev => ({
                ...prev,
                ...config
              }));
            }
            setShowSettings(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>To Do Settings</DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(60vh,500px)] overflow-y-auto py-4">
            <div className="space-y-4 px-1">
              <div className="grid gap-2">
                <Label htmlFor="title">Widget Title</Label>
                <Input
                  id="title"
                  placeholder="Todo List"
                  value={localConfig.title || ''}
                  onChange={handleTitleChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="showCompleted">Show Completed Items</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showCompleted"
                    checked={!!localConfig.showCompletedItems}
                    onCheckedChange={handleShowCompletedChange}
                  />
                  <Label htmlFor="showCompleted" className="text-sm text-gray-500">
                    {localConfig.showCompletedItems ? 'On' : 'Off'}
                  </Label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Select
                  value={localConfig.sortOrder || 'created'}
                  onValueChange={(value: 'created' | 'alphabetical' | 'completed' | 'manual') => handleSortOrderChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Created Date</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="completed">Completion Status</SelectItem>
                    <SelectItem value="manual">Manual (Drag to Sort)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              {config?.onDelete && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (config.onDelete) {
                      config.onDelete();
                    }
                  }}
                  aria-label="Delete this widget"
                >
                  Delete
                </Button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset to original config on cancel
                    if (config) {
                      setLocalConfig(prev => ({
                        ...prev,
                        ...config
                      }));
                    }
                    setShowSettings(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={saveSettings}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div
      ref={widgetRef}
      className={`widget-container h-full flex flex-col ${isTiny ? 'widget-drag-handle' : ''}`}
    >
      {!isTiny && !isApp && (
        <WidgetHeader
          title={localConfig.title || defaultConfig.title}
          onSettingsClick={readOnly ? undefined : () => setShowSettings(true)}
          compact={isShort}
        />
      )}

      <div className={`flex-1 overflow-hidden ${isTiny ? 'p-1' : isApp ? '' : 'p-3'}`}>
        {renderContent()}
      </div>

      {renderSettings()}
    </div>
  );
};

export default TodoWidget;
