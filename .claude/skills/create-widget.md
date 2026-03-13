# Create Widget

Use this skill when the user asks to create a new widget, add a widget, scaffold a widget, or build a new dashboard component for Boxento.

## Design Philosophy: Icon → Widget → App → Environment

Every Boxento component exists on a **continuous spectrum controlled entirely by the space it's given**. You resize an icon, it becomes a widget. You resize a widget, it becomes a full application. The component doesn't know or care what surface it's on — a flat dashboard, a phone screen, a floating window in a spatial OS like visionOS. It just knows how much space it has and adapts.

This philosophy is surface-agnostic by design. Today Boxento runs on a 2D grid dashboard, but the same mental model extends to spatial computing where "size" also means depth, distance from the user, and level of immersion:

| Space given | Mode | Flat surface | Spatial OS (visionOS) | User relationship |
|-------------|------|-------------|----------------------|-------------------|
| **Minimal** | Icon | 1x1 grid cell | Ornament / glanceable badge | **Peripheral** — you notice it |
| **Small** | Micro-widget | 2x2 grid | Small floating window | **Glance** — you look at it briefly |
| **Medium** | Widget | 3x3 grid | Standard window | **Focus** — you engage with it |
| **Large** | Panel | 4x4–5x5 grid | Large window with depth/layers | **Work** — you use it actively |
| **Full** | App | 6x6+ grid | Full window, possibly with volumes | **Occupy** — it's your primary context |
| **Immersive** | Environment | (future) | Full space / volumetric | **Inhabit** — you're inside it |

### Core principles

1. **Design top-down.** Start from the fullest experience (what would this be as a standalone app?), then progressively compress. Every smaller size is a lossy compression of the larger one. The icon is the smallest possible summary of what the app does.

2. **The component adapts to space, not to a platform.** Don't code for "desktop" or "mobile" or "visionOS." Code for "I have this much space and these interaction capabilities." This makes every widget future-proof across surfaces.

3. **Interaction fidelity scales with space.** An icon is tap-only. A widget supports simple gestures. A panel supports inline editing. An app supports keyboard shortcuts, drag-and-drop, multi-selection. A spatial environment could support gaze, pinch, voice. Design each tier's interactions to match the attention level.

4. **Information density scales with space.** An icon shows one thing. A micro-widget shows 2-3 things. A widget shows a list. A panel shows a list + detail. An app shows multiple coordinated views. Never dump app-level density into widget-level space.

5. **Every tier should feel intentionally designed, not truncated.** A 2x2 weather widget isn't a cropped 6x6 weather app — it's a purpose-built glanceable experience. Each tier is its own design, informed by the tier above it.

### What "app mode" looks like (6x6+)

At large sizes, widgets should adopt real application patterns:

- **Multi-panel layouts** — master list on left, detail pane on right (like Mail, Things, Bear)
- **Navigation** — tabs, breadcrumbs, or sidebar to switch between views/sections
- **Inline editing** — edit content directly in the view, not just through settings modals
- **Search and filter** — find items, filter by category/status/date
- **Rich interactions** — drag-and-drop reordering, context menus, keyboard shortcuts
- **Content drill-down** — click an item to expand into full detail, back button to return

Reference widgets that approach this today:
- **CalendarWidget** at 4x4+: two-panel split (month grid + weekly agenda sidebar)
- **OllamaWidget** at 4x4+: full chat interface with streaming, model selector
- **ReaderWidget** at 4x4+: summary → reading mode transition with styled HTML, progress bar
- **TodoWidget** at 4x4+: two-column pending/completed split

## Overview

Boxento widgets are self-contained React components that live on a draggable, resizable grid dashboard. Each widget has its own folder under `src/components/widgets/`, its own types, and is registered in a central registry. Widgets persist their configuration through a config manager and render responsively across breakpoints from 4K to mobile.

## Steps to Create a New Widget

### Step 1: Understand the requirement (think top-down, surface-agnostic)

Before writing code, clarify:
- **What would the full app version look like?** If this widget were a standalone desktop app — or a full window floating in a spatial OS — what features would it have? What's the interaction model? (This defines your 6x6+ render.)
- **What's the single most important signal it emits?** One number, one icon, one color. (This defines your 1x1 icon — and what a glanceable ornament in spatial computing would show.)
- **What interaction fidelity does each tier need?** Icon = tap. Widget = simple gestures. Panel = inline editing. App = keyboard shortcuts, multi-select, drag-and-drop.
- What data does it display or manage?
- Does it need external API calls? If so, what APIs?
- Does it need user configuration (settings modal)?
- What's the minimum sensible size? (most widgets are 2x2 minimum; only very simple ones support 1x1)
- What categories does it belong to? Existing categories: `Information`, `Productivity`, `Finance`, `Media`, `Self-hosted`, `Developer`, `Fun`, `Utilities`

### Step 2: Create the widget folder and types

Create `src/components/widgets/{WidgetName}/types.ts`:

```typescript
import { WidgetProps } from '@/types';

export interface {WidgetName}Config {
  id?: string;
  title?: string;
  // Add widget-specific config fields here
  // These get persisted via configManager
  onUpdate?: (config: {WidgetName}Config) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown; // Required — allows config spreading
}

export type {WidgetName}Props = WidgetProps<{WidgetName}Config>;
```

**Important type rules:**
- Always include `id?`, `onUpdate?`, `onDelete?`, `readOnly?`, and the index signature `[key: string]: unknown`
- For list-based widgets, define item interfaces separately (e.g., `TodoItem`, `Service`)
- Use `Date` for date fields — the config manager auto-restores ISO strings to `Date` objects
- If the widget has API keys or secrets, those fields will be auto-encrypted if named `apiKey`, `token`, `secret`, `password`, or `key`

### Step 3: Create the widget component

Create `src/components/widgets/{WidgetName}/index.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import WidgetHeader from '../common/WidgetHeader';
import { {WidgetName}Config, {WidgetName}Props } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const defaultConfig: {WidgetName}Config = {
  title: '{Widget Display Name}',
  // ... sensible defaults for all config fields
};

const {WidgetName}: React.FC<{WidgetName}Props> = ({ width, height, config }) => {
  // --- Size detection (icon → widget → app spectrum) ---
  const isTiny = width === 1 && height === 1;
  const isShort = height === 1 && width > 1;
  const isCompact = width <= 2 || height <= 2;
  const isWide = width >= 4;
  const isTall = height >= 4;
  const isApp = width >= 6 && height >= 6;
  const readOnly = config?.readOnly ?? false;

  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState<{WidgetName}Config>({
    ...defaultConfig,
    ...config,
  });

  // Sync with external config changes
  useEffect(() => {
    setLocalConfig(prev => ({ ...prev, ...config }));
  }, [config]);

  // Persist config changes
  const saveSettings = () => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  };

  // Helper for updating config AND persisting immediately (for non-modal changes)
  const updateConfig = (updates: Partial<{WidgetName}Config>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    if (config?.onUpdate) {
      config.onUpdate(newConfig);
    }
  };

  // --- Size-specific renderers (icon → widget → app) ---
  // Design top-down: start from renderApp, then compress down to renderTiny.

  const renderTiny = () => (
    // 1x1 ICON: single number, icon, or status indicator
    <div className="flex-1 flex items-center justify-center">
      <span className="text-lg font-semibold">{/* summary value */}</span>
    </div>
  );

  const renderShort = () => (
    // Nx1 RIBBON: horizontal scroll of preview chips
    <div className="flex-1 flex items-center gap-2 overflow-x-auto">
      {/* horizontal chips/badges */}
    </div>
  );

  const renderCompact = () => (
    // 2x2 MICRO-WIDGET: tight layout, 2-3 key data points only
    <div className="flex-1 overflow-auto space-y-1">
      {/* compact list or minimal content */}
    </div>
  );

  const renderDefault = () => (
    // 3x3 WIDGET: balanced detail, one level of interaction
    <div className="flex-1 overflow-auto">
      {/* standard content */}
    </div>
  );

  const renderPanel = () => (
    // 4x4–5x5 PANEL: split views, inline editing, summary + detail
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">{/* primary column */}</div>
      <div className="w-2/5 border-l overflow-y-auto">{/* secondary column */}</div>
    </div>
  );

  const renderApp = () => (
    // 6x6+ APP: full application — master-detail, navigation, search, full CRUD
    // IMPORTANT: App view must include widget-drag-handle since WidgetHeader is hidden
    <div className="flex h-full flex-col">
      {/* App toolbar — MUST have widget-drag-handle cursor-move for dragging */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 widget-drag-handle cursor-move">
        <h2 className="text-base font-semibold text-foreground">{localConfig.title}</h2>
        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            Settings
          </Button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r overflow-y-auto">
          {/* master list with search */}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* detail pane */}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isTiny) return renderTiny();
    if (isShort) return renderShort();
    if (isApp) return renderApp();
    if (isWide && isTall) return renderPanel();
    if (isCompact) return renderCompact();
    return renderDefault();
  };

  return (
    <div className={cn('widget-container h-full flex flex-col', isTiny ? 'widget-drag-handle' : '')}>
      {/* WidgetHeader is hidden for tiny (whole widget is drag handle) and app (has its own toolbar) */}
      {!isTiny && !isApp && (
        <WidgetHeader
          title={localConfig.title}
          onSettingsClick={readOnly ? undefined : () => setShowSettings(true)}
          compact={isShort}
        />
      )}

      <div className={cn('flex-1 overflow-hidden', isTiny ? 'p-1' : isApp ? '' : 'p-2')}>
        {renderContent()}
      </div>

      {/* Settings Modal — see "Settings Modal Design Guide" below */}
      {showSettings && (
        <Dialog open={showSettings} onOpenChange={(open) => { if (!open) setShowSettings(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{localConfig.title || '{Widget Display Name}'} Settings</DialogTitle>
            </DialogHeader>

            <div className="max-h-[min(60vh,500px)] overflow-y-auto py-4">
              <div className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={localConfig.title || ''}
                    onChange={(e) =>
                      setLocalConfig(prev => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>
                {/* Add more settings fields — see modal design guide */}
              </div>
            </div>

            <DialogFooter>
              <div className="flex justify-between w-full">
                {config?.onDelete && (
                  <Button variant="destructive" onClick={config.onDelete}>Delete Widget</Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
                  <Button onClick={saveSettings}>Save</Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default {WidgetName};
```

### Step 4: Register the widget

In `src/components/widgets/index.ts`, make three changes:

**1. Add the lazy import** (in the imports section, alphabetically):

```typescript
const {WidgetName} = React.lazy(() => import('./{WidgetName}/index'));
```

**2. Add to `BASE_WIDGET_REGISTRY`** array:

```typescript
{
  type: '{widget-type}',         // kebab-case identifier, unique
  name: '{Widget Display Name}',
  icon: '{LucideIconName}',      // From lucide-react (e.g., 'Cloud', 'ListTodo', 'Globe')
  minWidth: 2,                   // Minimum grid columns (1 only if truly tiny-ready)
  minHeight: 2,                  // Minimum grid rows
  defaultWidth: 3,               // Default columns on first add
  defaultHeight: 3,              // Default rows on first add
  category: '{Category}',        // One of the existing categories
  description: '{One-line description for the widget selector}'
}
```

**3. Add to `WIDGET_COMPONENTS`** map:

```typescript
'{widget-type}': {WidgetName} as unknown as LazyWidgetComponent,
```

**4. Add to `TINY_READY_WIDGET_TYPES`** (all widgets support 1x1):

```typescript
TINY_READY_WIDGET_TYPES.add('{widget-type}');
```

All widgets are expected to support 1x1 (icon) size. The `renderTiny()` function should show a meaningful icon or summary value.

### Step 5: Export types (if needed externally)

If other components need your widget's types, add to `src/components/widgets/index.ts`:

```typescript
export * from './{WidgetName}/types';
```

## Size-Specific Rendering Guide

`width` and `height` are grid units (not pixels). Every widget must render as a native experience at every size on the icon → widget → app spectrum.

### Size tiers

| Size | Tier | Variables | What to render | Interaction model |
|------|------|-----------|---------------|-------------------|
| **1x1** | Icon | `isTiny` | Single glyph, number, status dot, or badge. Centered. No chrome. | Tap = open settings or primary action |
| **Nx1** | Ribbon | `isShort` | Horizontal scroll: badge/count + preview chips. No vertical stacking. | Scroll to see more |
| **2x2** | Micro | `isCompact` | Primary data only. Small text. Tight spacing. No descriptions or secondary info. | Tap items for basic actions |
| **3x2 / 2x3** | Small | default | Primary + some secondary data. Single column (tall) or side-by-side (wide). | Simple list interactions |
| **3x3** | Widget | default | Balanced layout. Lists with reasonable items, standard text sizes, one level of detail. | List + basic inline actions |
| **4x3 / 3x4** | Large widget | `isWide` / `isTall` | More items visible, secondary metadata shown. Multi-column for wide. | Scrollable lists with actions |
| **4x4 – 5x5** | Panel | `isWide && isTall` | Multi-section layout. Split views start here. Inline editing. Summary + detail in one view. | Click-to-expand, inline edit |
| **6x6+** | App | `isApp` | Full application experience. Master-detail, navigation, search/filter, full CRUD, keyboard shortcuts. | Desktop-app-grade interaction |

### Size detection pattern

```typescript
const isTiny = width === 1 && height === 1;
const isShort = height === 1 && width > 1;
const isCompact = width <= 2 || height <= 2;
const isWide = width >= 4;
const isTall = height >= 4;
const isApp = width >= 6 && height >= 6;
```

### Branching order (most specific first)

```typescript
{isTiny ? renderTiny()
  : isShort ? renderShort()
  : isApp ? renderApp()
  : isWide && isTall ? renderPanel()
  : isWide ? renderWide()
  : isTall ? renderTall()
  : isCompact ? renderCompact()
  : renderDefault()}
```

### Designing top-down: start from the app, compress down

When creating a new widget, **design the app-mode (6x6+) first**, then progressively remove features as you go smaller:

1. **App (6x6+):** What would a dedicated desktop app for this look like? Multi-panel, full navigation, search, all features accessible. Design this first.
2. **Panel (4x4–5x5):** Remove the least-used panel. Collapse navigation into a simpler form. Keep inline editing and detail views.
3. **Widget (3x3):** Single-panel. Show a list or primary view. Interactions limited to taps. Detail opens in a modal or overlay.
4. **Micro (2x2):** The most important 2-3 data points. Maybe one tap action.
5. **Icon (1x1):** One number, one icon, one color. That's it.

### App-mode patterns (6x6+)

When a widget reaches app size, it should adopt real application UX:

**Master-detail layout:**
```tsx
const renderApp = () => (
  <div className="flex h-full flex-col">
    {/* App toolbar — MUST have widget-drag-handle cursor-move */}
    <div className="flex items-center justify-between border-b border-border px-4 py-2 widget-drag-handle cursor-move">
      <h2 className="text-base font-semibold text-foreground">{localConfig.title}</h2>
      {!readOnly && (
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>Settings</Button>
      )}
    </div>
    <div className="flex flex-1 overflow-hidden">
      {/* Master list — 1/3 width */}
      <div className="w-1/3 border-r overflow-y-auto">
        <div className="p-2 border-b">
          <Input placeholder="Search..." />
        </div>
        {items.map(item => (
          <div
            key={item.id}
            className={cn('p-3 cursor-pointer hover:bg-accent', selectedId === item.id && 'bg-accent')}
            onClick={() => setSelectedId(item.id)}
          >
            {item.title}
          </div>
        ))}
      </div>
      {/* Detail pane — 2/3 width */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedItem ? renderDetail(selectedItem) : renderEmptyState()}
      </div>
    </div>
  </div>
);
```

**Tabbed navigation (for multi-section apps):**
```tsx
const renderApp = () => (
  <div className="flex flex-col h-full">
    {/* Tab bar doubles as drag handle */}
    <div className="flex border-b border-border px-2 widget-drag-handle cursor-move">
      {['Inbox', 'Today', 'Upcoming', 'Projects'].map(tab => (
        <Button
          key={tab}
          variant="ghost"
          className={cn(
            'px-3 py-2 text-sm rounded-none',
            activeTab === tab
              ? 'border-b-2 border-primary font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </Button>
      ))}
    </div>
    <div className="flex-1 overflow-auto">
      {renderTabContent(activeTab)}
    </div>
  </div>
);
```

**Inline editing (edit in place, not just modals):**
```tsx
// Click-to-edit pattern
const [editingId, setEditingId] = useState<string | null>(null);

{editingId === item.id ? (
  <Input
    autoFocus
    value={editValue}
    onChange={(e) => setEditValue(e.target.value)}
    onBlur={() => saveAndStopEditing()}
    onKeyDown={(e) => e.key === 'Enter' && saveAndStopEditing()}
  />
) : (
  <span onDoubleClick={() => startEditing(item)}>{item.text}</span>
)}
```

### Panel-mode patterns (4x4–5x5)

At panel size, use split views but with a simpler structure than full app mode:

```tsx
const renderPanel = () => (
  <div className="flex flex-col h-full">
    {/* Summary bar */}
    <div className="flex items-center justify-between px-3 py-2 border-b">
      <span className="text-sm font-medium">{items.length} items</span>
      <Button size="sm" variant="outline">Add</Button>
    </div>
    {/* Two-column content */}
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">{/* Primary column */}</div>
      <div className="w-2/5 border-l overflow-y-auto">{/* Secondary column */}</div>
    </div>
  </div>
);
```

### Dynamic grid columns (for grid-based widgets)

When the widget displays a grid of cards/items, calculate columns from measured pixel width:

```typescript
const getGridColumns = (measuredWidth: number) => {
  if (measuredWidth >= 1100) return 4;
  if (measuredWidth >= 680) return 3;
  if (measuredWidth >= 430) return 2;
  return 1;
};
```

Or fall back to grid units if pixel measurement isn't available:

```typescript
const cols = width >= 12 ? 5 : width >= 9 ? 4 : width >= 6 ? 3 : width >= 3 ? 2 : 1;
```

### Size-responsive text and spacing

| Element | Icon (1x1) | Compact (2x2) | Widget (3x3) | Panel (4x4) | App (6x6+) |
|---------|-----------|----------------|---------------|-------------|-------------|
| Primary value | `text-lg` | `text-lg` | `text-2xl` | `text-3xl` | `text-4xl` |
| Secondary text | — | `text-[10px]` | `text-xs` | `text-sm` | `text-sm` |
| List item | — | `py-0.5` | `py-1` | `py-2` | `py-2 px-3` |
| Padding | `p-1` | `p-1 to p-2` | `p-2 md:p-3` | `p-3` | `p-4` |

### Real examples from the codebase

**CalendarWidget** (best app-mode example):
```
4x4+ → Two-panel: month grid (left) + weekly agenda sidebar (right) with event details
3x3  → Month grid with event dots, click to see day events
2x3  → Compact month grid
2x2  → Today's date + next event summary
```

**TodoWidget** size branching:
```
4x4+ → 2-column: pending tasks | completed tasks
4xN  → 2-column: tasks left | add form right
Nx4  → single column, spacious, large form at bottom
≤2x2 → single column, small checkboxes, tight spacing
```

**OllamaWidget** (chat app pattern):
```
4x4+ → Full chat: message history + model selector + streaming input
3x3  → Chat with shorter history, no model selector
2x2  → Last message + input field only
```

**ServicesWidget** size branching:
```
1x1  → "5/8 online" centered text
Nx1  → horizontal ribbon: badge + preview chips
≤2x2 → compact grid of icon buttons
3x3+ → full service cards with descriptions, status, category
```

---

## Settings Modal Design Guide

Every widget with configurable options needs a settings modal. Follow these patterns to keep the UX consistent.

### Modal structure

```
DialogContent (sm:max-w-md by default)
  ├── DialogHeader
  │     └── DialogTitle ("Widget Name Settings")
  ├── Content area (space-y-4)
  │     ├── Form group 1 (Label + Input/Switch/Select)
  │     ├── Form group 2
  │     ├── ... (or Tabs if 3+ sections)
  │     └── Scrollable list (if list-based, max-h capped)
  └── DialogFooter
        ├── Delete button (left, destructive variant)
        └── Cancel + Save buttons (right)
```

### Modal sizing

| Widget complexity | DialogContent class | When to use |
|-------------------|-------------------|-------------|
| Simple (2-5 fields) | `sm:max-w-md` | Most widgets (default) |
| Medium (lists, tabs) | `sm:max-w-md` to `sm:max-w-lg` | Widgets with item lists |
| Complex (table/grid editor) | `max-w-[calc(100vw-2rem)] sm:max-w-[980px]` | Only for heavy list editors like ServicesWidget |

### Form field patterns

**Text input:**
```tsx
<div>
  <Label htmlFor="title">Title</Label>
  <Input
    id="title"
    value={localConfig.title || ''}
    onChange={(e) => setLocalConfig(prev => ({ ...prev, title: e.target.value }))}
  />
</div>
```

**Toggle switch:**
```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="show-status">Show status indicators</Label>
  <Switch
    id="show-status"
    checked={localConfig.showStatus ?? true}
    onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, showStatus: checked }))}
  />
</div>
```

**Dropdown select:**
```tsx
<div>
  <Label>Sort order</Label>
  <Select
    value={localConfig.sortOrder || 'created'}
    onValueChange={(value) => setLocalConfig(prev => ({ ...prev, sortOrder: value }))}
  >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="created">Date created</SelectItem>
      <SelectItem value="alphabetical">Alphabetical</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Radio group:**
```tsx
<div>
  <Label>Temperature units</Label>
  <RadioGroup
    value={localConfig.units || 'metric'}
    onValueChange={(value) => setLocalConfig(prev => ({ ...prev, units: value }))}
    className="flex gap-4 mt-1"
  >
    <div className="flex items-center gap-2">
      <RadioGroupItem value="metric" id="metric" />
      <Label htmlFor="metric">Celsius</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="imperial" id="imperial" />
      <Label htmlFor="imperial">Fahrenheit</Label>
    </div>
  </RadioGroup>
</div>
```

### Tabbed settings (for 3+ sections)

Use when the modal has logically distinct sections (e.g., Content / Display / Examples):

```tsx
<Tabs defaultValue="content" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="content">Content</TabsTrigger>
    <TabsTrigger value="display">Display</TabsTrigger>
    <TabsTrigger value="examples">Examples</TabsTrigger>
  </TabsList>
  <TabsContent value="content" className="space-y-4">
    {/* Content settings */}
  </TabsContent>
  <TabsContent value="display" className="space-y-4">
    {/* Display settings */}
  </TabsContent>
  <TabsContent value="examples" className="space-y-4">
    {/* Example configs */}
  </TabsContent>
</Tabs>
```

### Editable list pattern (for list-based widgets)

Widgets that manage a list of items (services, links, feeds, etc.) use this pattern:

```tsx
{/* Scrollable list with max height */}
<div className="max-h-[min(54vh,520px)] overflow-y-auto border rounded-lg divide-y">
  {localConfig.items?.map((item) => (
    <div key={item.id} className="flex items-center gap-2 p-2">
      <span className="flex-1 truncate">{item.name}</span>
      <Button variant="ghost" size="sm" onClick={() => editItem(item)}>Edit</Button>
      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  ))}
</div>

{/* Add button below the list */}
<Button variant="outline" className="w-full" onClick={addNewItem}>
  <Plus className="h-4 w-4 mr-2" /> Add Item
</Button>
```

**Scrollable list height rules:**
- Short lists (≤5 items expected): `max-h-[200px]`
- Medium lists: `max-h-[300px]`
- Long/variable lists: `max-h-[min(54vh,520px)]` (viewport-responsive cap)

### Dual-dialog pattern (for list items that need their own editor)

When items in a list need a full edit form, use a separate dialog:

```tsx
const [showSettings, setShowSettings] = useState(false);       // Main settings
const [editingItem, setEditingItem] = useState<Item | null>(null); // Item editor

// Main settings dialog: shows the list + add/delete
<Dialog open={showSettings} onOpenChange={setShowSettings}>...</Dialog>

// Separate item edit dialog
<Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
  <DialogContent className="sm:max-w-lg">
    {/* Full item edit form */}
  </DialogContent>
</Dialog>
```

### Initial setup detection

If the widget requires configuration before it can render (e.g., a location, an API key), show a setup prompt:

```tsx
if (!localConfig.requiredField) {
  return (
    <div className="w-full h-full flex flex-col bg-card rounded-lg p-2 md:p-3">
      <WidgetHeader title={localConfig.title} onSettingsClick={() => setShowSettings(true)} />
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Settings className="h-8 w-8" />
        <p className="text-sm">Configure this widget to get started</p>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          Open Settings
        </Button>
      </div>
      {/* Settings dialog still renders here */}
    </div>
  );
}
```

### Validation

- **On save** (most common): validate all fields in `saveSettings()`, show errors inline.
- **Real-time URL validation**: `try { new URL(value); } catch { /* invalid */ }`
- **Async validation** (API checks): use `await` in `saveSettings`, show loading state on Save button.
- **Error display**: `<p className="text-xs text-red-500">{error}</p>` below the field.

### Footer layout

```tsx
<DialogFooter>
  <div className="flex justify-between w-full">
    {config?.onDelete && (
      <Button variant="destructive" onClick={config.onDelete}>Delete Widget</Button>
    )}
    <div className="flex items-center gap-2 ml-auto">
      <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
      <Button onClick={saveSettings}>Save</Button>
    </div>
  </div>
</DialogFooter>
```

- Delete button always on the **left** (destructive variant).
- Cancel + Save always on the **right**.
- Save is the **default/primary** variant.

---

## Key Architecture Rules

### Config persistence
- `config.onUpdate(localConfig)` is how you persist. The App component handles saving via configManager.
- For settings modals: accumulate changes in `localConfig` state, then call `onUpdate` on Save.
- For inline edits (toggling a todo, reordering items): call `onUpdate` immediately after `setLocalConfig`.
- Never call configManager directly from a widget — always go through `config.onUpdate`.

### Read-only mode
- Check `config?.readOnly` — if true, disable all editing (no add/delete/edit buttons, no settings changes).
- This is used for shared/public dashboards.

### Dark mode
- Use semantic tokens (`bg-card`, `text-foreground`, `border-border`, etc.) which automatically adapt to dark mode — no `dark:` variants needed in most cases.
- Only use `dark:` variants for truly theme-specific adjustments (e.g., status color tints like `bg-green-500/10 dark:bg-green-500/20`).
- If you need runtime detection: `document.documentElement.classList.contains('dark')`.
- Never hardcode light-only colors like `bg-white` or `text-gray-800`.

### Drag handle
- **Non-app sizes**: `WidgetHeader` includes the drag handle automatically (via `widget-drag-handle` class).
- **Tiny (1x1)**: The entire widget container is the drag handle — use `cn('widget-container h-full flex flex-col', isTiny ? 'widget-drag-handle' : '')`.
- **App view (6x6+)**: `WidgetHeader` is hidden at app size. You **MUST** add `widget-drag-handle cursor-move` to the app view's toolbar/header div. Every app view needs a draggable area.

### Error handling
- Widgets are wrapped in `WidgetErrorBoundary` + `Suspense` by the App — you don't need to add these yourself.
- Do handle API errors gracefully within the widget (show error states, retry buttons).

### Styling conventions
- Use the `widget-container` CSS class on the outermost div — it provides background, border, border-radius, padding, and overflow hidden. Do NOT manually add `bg-card rounded-lg` etc.
- Use `cn()` from `@/lib/utils` for conditional className composition (not template literals).
- Use **semantic color tokens** — never hardcode colors:
  - `text-foreground`, `text-muted-foreground` (not `text-gray-600`)
  - `bg-muted`, `bg-card`, `bg-accent` (not `bg-gray-100`)
  - `border-border` (not `border-gray-200`)
  - `hover:text-destructive` (not `hover:text-red-500`)
  - `text-primary` (not `text-blue-600`)
  - Status colors (green for success, red for errors) are acceptable as semantic indicators
- Use shadcn/ui components for all form elements: `Dialog`, `Button`, `Input`, `Label`, `Switch`, `Select`, `Slider`, `Checkbox`, `RadioGroup`.
- Use `space-y-4` for settings form spacing.
- Use `flex-1 overflow-auto` for the scrollable content area.

### URL sanitization
- If the widget accepts user-provided URLs (for links, iframes, images), sanitize them to prevent XSS:
```typescript
const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    return '#';
  } catch { return '#'; }
};
```

### Data fetching
- Fetch in `useEffect` based on config values.
- Implement refresh intervals with `setInterval` in `useEffect` (clean up on unmount).
- Use `AbortSignal.timeout()` for fetch timeouts.
- Show loading skeletons during initial fetch (import from `@/components/ui/skeleton`).

### Sensitive fields
- Fields named `apiKey`, `token`, `secret`, `password`, or `key` are auto-encrypted by configManager.
- If you have a sensitive field with a different name, you can pass custom `sensitiveFields` but this is handled at the App level, not in the widget.

## File Reference

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Core `WidgetConfig`, `WidgetProps<T>` interfaces |
| `src/components/widgets/index.ts` | Registry, lazy imports, `WIDGET_COMPONENTS` map |
| `src/components/widgets/common/WidgetHeader.tsx` | Shared header with drag handle + settings button |
| `src/components/widgets/common/WidgetErrorBoundary.tsx` | Error boundary wrapping all widgets |
| `src/components/widgets/common/WidgetSelector.tsx` | Modal for adding widgets |
| `src/lib/constants.ts` | Grid breakpoints, column counts, timing constants |
| `src/lib/utils.ts` | `cn()` utility for conditional className composition |
| `src/lib/configManager.ts` | Config persistence with encryption |
| `src/lib/layoutUtils.ts` | Layout placement and validation |
| `src/App.tsx` | Widget rendering pipeline, grid setup |

## Checklist

Before considering the widget complete, verify:

**Types & registration:**
- [ ] `types.ts` has the index signature `[key: string]: unknown`
- [ ] Registered in all three places in `index.ts` (lazy import, registry, components map)
- [ ] Widget type string is kebab-case and unique
- [ ] Category matches an existing category
- [ ] Icon is a valid Lucide icon name

**Component & config:**
- [ ] Component syncs with external config via `useEffect` on `config`
- [ ] Settings modal calls `config.onUpdate` on save
- [ ] Read-only mode disables all editing UI

**Size rendering (icon → widget → app):**
- [ ] Widget renders correctly at its minimum size (usually 2x2)
- [ ] 1x1 (tiny): shows summary icon/value, added to `TINY_READY_WIDGET_TYPES`, entire widget is drag handle
- [ ] Nx1 (ribbon): horizontal layout, no vertical stacking
- [ ] Compact (≤2x2) uses smaller text and tighter spacing; long text (weekday/month names) uses short format with `truncate`
- [ ] Panel (4x4–5x5): split views, inline editing, summary + detail
- [ ] App (6x6+): full application experience — master-detail, navigation, search, CRUD
- [ ] App view has `widget-drag-handle cursor-move` on its toolbar/header (since WidgetHeader is hidden at app size)
- [ ] Size branching follows most-specific-first order (tiny → short → app → panel → compact → default)
- [ ] Designed top-down: app-mode conceived first, then progressively compressed

**Settings modal:**
- [ ] Uses `sm:max-w-md` (or wider only for complex list editors)
- [ ] Has Delete button (left, destructive) + Cancel/Save (right)
- [ ] List-based settings use scrollable container with `max-h` cap
- [ ] Shows setup prompt if required config is missing (instead of empty/broken widget)
- [ ] Form fields use proper shadcn/ui components (Input, Switch, Select, etc.)

**Theming & styling:**
- [ ] Uses `widget-container` class on outermost div (provides bg, border, radius, overflow)
- [ ] Uses `cn()` for conditional classNames (not template literals)
- [ ] Uses semantic color tokens (`text-foreground`, `bg-muted`, `border-border`, `hover:text-destructive`, `text-primary`) — no hardcoded grays, reds, blues
- [ ] Dark mode works via semantic tokens — minimal `dark:` overrides
- [ ] User-provided URLs are sanitized with `sanitizeUrl()` if used in href/src
