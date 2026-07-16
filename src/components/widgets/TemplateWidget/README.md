# Template Widget

A starter implementation for creating new widgets in Boxento.

## Quick Start

1. **Copy this template**:
   ```bash
   cp -r src/components/widgets/TemplateWidget src/components/widgets/MyNewWidget
   ```

2. **Rename components and update imports**:
   - Rename `TemplateWidgetProps` and `TemplateWidgetConfig` in `types.ts`
   - Update the component name in `index.tsx`
   - Update imports in all files

3. **Register your widget** in `src/components/widgets/index.ts`:
   ```typescript
   export const WIDGET_REGISTRY: EnhancedWidgetConfig[] = [
     // ... existing widgets
     {
       type: 'my-new-widget',
       name: 'My New Widget',
       icon: 'Icon',
       minWidth: 2,
       minHeight: 2,
       defaultWidth: 2,
       defaultHeight: 2,
       category: 'Category',
       description: 'Description of what my widget does'
     }
   ];

   export const getWidgetComponent = (type: string): React.ComponentType<WidgetProps<any>> | null => {
     switch (type) {
       case 'my-new-widget':
         return MyNewWidget;
       default:
         return null;
     }
   };
   ```

4. **Implement your widget functionality** by updating the content in the render methods.

## Widget Structure

```tsx
<div ref={widgetRef} className="widget-container h-full flex flex-col">
  <WidgetHeader title={title} onSettingsClick={handler} />
  <div className="flex-grow p-4 overflow-hidden">
    {/* Content here */}
  </div>
  {/* Settings dialog */}
</div>
```

## Requirements

- Use `widget-container` class on the root element
- Use `WidgetHeader` component with proper title and settings button
- Content area has proper padding and overflow handling
- Implements responsive layouts for different sizes
- Supports both light and dark themes
- Includes settings dialog with delete button
