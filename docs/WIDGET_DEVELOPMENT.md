# Widget Development Guide

This guide explains how to create new widgets for Boxento. Widgets are modular, resizable components that display information or provide functionality on the Boxento dashboard.

> **Quick Start**: For a ready-to-use template that follows all the patterns described in this guide, see the [Template Widget](../src/components/widgets/TemplateWidget/README.md).

## Widget Architecture

Widgets in Boxento follow a consistent architecture:

1. **React Component**: Each widget is a React component that accepts `width`, `height`, and `config` props.
2. **Configuration Object**: Each widget exports a configuration object with metadata about the widget.
3. **Registry**: Widgets are registered in the central registry (`src/components/widgets/index.ts`).

## Creating a New Widget

### Step 1: Create the Widget Directory and Files

Create a new directory in the `src/components/widgets` directory. Name it according to its functionality, e.g., `MyWidget`. Inside this directory, create three main files:

1. `index.tsx` - The main widget component
2. `types.ts` - TypeScript type definitions for the widget
3. `README.md` - Documentation for the widget

### Step 2: Define Widget Types

First, define the types for your widget in the `types.ts` file:

```typescript
import { WidgetProps } from '@/types';

/**
 * Configuration options for the My widget
 * 
 * @interface MyWidgetConfig
 * @property {string} [id] - Unique identifier for the widget instance
 * @property {string} [someConfig] - Description of this config option
 */
export interface MyWidgetConfig {
  id?: string;
  someConfig?: string;
  onUpdate?: (config: MyWidgetConfig) => void;
  onDelete?: () => void;
}

/**
 * Props for the My widget component
 * 
 * @type MyWidgetProps
 */
export type MyWidgetProps = WidgetProps<MyWidgetConfig>;
```

### Step 3: Implement the Widget Component

Implement the widget component in the `index.tsx` file:

```tsx
import React, { useState, useEffect, useRef } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog'
import WidgetHeader from '../common/WidgetHeader'
import { MyWidgetProps, MyWidgetConfig } from './types'

/**
 * My Widget Component
 * 
 * [Description of what your widget does]
 * 
 * @param {MyWidgetProps} props - Component props
 * @returns {JSX.Element} Widget component
 */
const MyWidget: React.FC<MyWidgetProps> = ({ width, height, config }) => {
  const defaultConfig: MyWidgetConfig = {
    someConfig: 'default value'
  };

  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState<MyWidgetConfig>({
    ...defaultConfig,
    ...config
  });
  
  const widgetRef = useRef<HTMLDivElement>(null);
  
  // Update local config when props change
  useEffect(() => {
    setLocalConfig(prevConfig => ({
      ...prevConfig,
      ...config
    }));
  }, [config]);
  
  // Render different views based on widget size
  const renderContent = () => {
    // Check for different size combinations
    if (width === 2 && height === 2) {
      return renderDefaultView(); // 2x2 default view
    } else if (width > 2 && height === 2) {
      return renderWideView(); // Wide view (e.g., 4x2)
    } else if (width === 2 && height > 2) {
      return renderTallView(); // Tall view (e.g., 2x4)
    } else {
      return renderLargeView(); // Large view (e.g., 4x4, 6x6)
    }
  };

  // Default view for 2x2 layout
  const renderDefaultView = () => {
    return (
      <div className="h-full">
        {/* Default content for 2x2 */}
      </div>
    );
  };

  // Wide view for layouts like 4x2, 6x2
  const renderWideView = () => {
    return (
      <div className="h-full">
        {/* Content for wide layout */}
      </div>
    );
  };

  // Tall view for layouts like 2x4, 2x6
  const renderTallView = () => {
    return (
      <div className="h-full">
        {/* Content for tall layout */}
      </div>
    );
  };

  // Large view for 4x4, 6x6, etc.
  const renderLargeView = () => {
    return (
      <div className="h-full">
        {/* Full content for large view */}
      </div>
    );
  };
  
  // Save settings
  const saveSettings = () => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  };
  
  // Settings modal using shadcn/ui Dialog
  const renderSettings = () => {
    return (
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Widget Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Your settings form here */}
          </div>
          
          <DialogFooter>
            {config?.onDelete && (
              <button
                className="px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors"
                onClick={() => {
                  if (config.onDelete) {
                    config.onDelete();
                  }
                }}
                aria-label="Delete this widget"
              >
                Delete Widget
              </button>
            )}
            <button 
              onClick={saveSettings}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div ref={widgetRef} className="widget-container h-full flex flex-col">
      <WidgetHeader 
        title="My Widget" 
        onSettingsClick={() => setShowSettings(!showSettings)}
      />
      
      <div className="flex-grow p-4 overflow-hidden">
        {renderContent()}
      </div>
      
      {/* Settings modal */}
      {renderSettings()}
    </div>
  );
};

export default MyWidget;
```

### Step 4: Document Your Widget

Create a README.md file for your widget with usage instructions and examples:

```markdown
# My Widget

[Brief description of what your widget does and its purpose]

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Usage

[Instructions on how to use the widget]

## Settings

[Description of available settings]

## Responsive Sizing

[How the widget responds to different sizes]
```

### Step 5: Register the Widget

Update the widget registry in `src/components/widgets/index.ts`:

```typescript
// Add import at the top
import MyWidget from './MyWidget/index';

// Add types export
export * from './MyWidget/types';

// Add to WIDGET_REGISTRY array
export const WIDGET_REGISTRY: EnhancedWidgetConfig[] = [
  // ... existing widgets
  {
    type: 'my-widget',
    name: 'My Widget',
    icon: 'Icon',
    minWidth: 2,
    minHeight: 2,
    defaultWidth: 2,
    defaultHeight: 2,
    category: 'Category',
    description: 'Description of what my widget does'
  }
];

// Add to getWidgetComponent function
export const getWidgetComponent = (type: string): React.ComponentType<WidgetProps<any>> | null => {
  switch (type) {
    // ... existing cases
    case 'my-widget':
      return MyWidget;
    default:
      return null;
  }
};
```

## Widget Requirements

### 1. Styling and Structure

All widgets MUST use a consistent structure and styling:

#### Standard Widget Structure

```tsx
<div ref={widgetRef} className="widget-container h-full flex flex-col">
  <WidgetHeader 
    title="Widget Title" 
    onSettingsClick={() => setShowSettings(true)}
  />
  
  <div className="flex-grow p-4 overflow-hidden">
    {/* Widget content goes here */}
  </div>
  
  {/* Settings dialog */}
</div>
```

#### Required Classes

- **`widget-container`**: This base class MUST be used on the root div of every widget. It provides standard styling for borders, shadows, backgrounds, and overflow handling.
- **`h-full`** and **`flex flex-col`**: Required for proper sizing and layout.
- Content container must use **`flex-grow`** and **`overflow-hidden`** for proper scrolling behavior.

#### Padding and Spacing

- Use **`p-4`** (or similar consistent padding) for the content container.
- For lists or grids, use **`space-y-2`** or **`gap-3`** for consistent item spacing.
- List items typically use **`p-2`** for internal padding.

#### Border Radius

- Use **`rounded-lg`** for card-like elements inside the widget.
- Buttons typically use **`rounded-md`** or **`rounded-lg`** depending on size.

### 2. Responsive Design

Widgets must be responsive to different sizes, with a minimum size of 2x2:

- **2x2**: Default view with essential information
- **Wide (e.g., 4x2)**: Horizontal layout with expanded information
- **Tall (e.g., 2x4)**: Vertical layout with expanded information
- **Large (e.g., 4x4, 6x6)**: Full view with detailed information

Note: Widgets cannot be smaller than 2x2 as this is enforced by the application.

### 3. Theme Support

Widgets must support both light and dark themes:

- Use Tailwind's `dark:` prefix for dark mode styles
- Test in both light and dark modes
- The `widget-container` class handles basic light/dark theming for the container

### 4. Settings

If your widget has configurable options:

- **Always use shadcn/ui Dialog components for settings modals**
- Import Dialog components from '../../ui/dialog'
- Follow the pattern shown in the example above
- Store settings in the widget's config object
- Provide sensible defaults
- **Always implement a delete button in the DialogFooter when config.onDelete is available**

#### Delete Functionality

All widgets must include a delete button in their settings modal:

```tsx
<DialogFooter>
  {config?.onDelete && (
    <button
      className="px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors"
      onClick={() => {
        if (config.onDelete) {
          config.onDelete();
        }
      }}
      aria-label="Delete this widget"
    >
      Delete Widget
    </button>
  )}
  <button
    onClick={saveSettings}
    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
  >
    Save
  </button>
</DialogFooter>
```

The delete button should:
- Only appear when `config.onDelete` is available
- Have consistent styling (red text with hover effects)
- Include proper accessibility attributes
- Be positioned in the DialogFooter alongside other actions

### 5. Performance

- Avoid unnecessary re-renders

### 6. Shared Credentials

If your widget requires API keys or other sensitive credentials, consider implementing the shared credentials system to improve user experience. This allows multiple instances of the same widget type to share API keys.

For detailed instructions on implementing shared credentials, refer to the [Shared Credentials documentation](./SHARED_CREDENTIALS.md).

## Examples

For examples, look at the existing widgets in the respective directories:

- **`TemplateWidget/`** - The reference implementation that follows all best practices (recommended starting point)
- `CalendarWidget/`
- `WeatherWidget/`
- `WorldClocksWidget/`
- `QuickLinksWidget/`
- `NotesWidget/`

These widgets demonstrate best practices for Boxento widget development.