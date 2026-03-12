import React, { ReactNode } from 'react';
import { Settings } from 'lucide-react';

interface WidgetHeaderProps {
  title?: string;
  icon?: ReactNode;
  onSettingsClick?: () => void;
  children?: ReactNode;
  compact?: boolean;
}

/**
 * Shared widget header component
 * 
 * @param props Component props
 * @returns Widget header component
 */
const WidgetHeader = ({ 
  title, 
  icon, 
  onSettingsClick, 
  children,
  compact = false,
}: WidgetHeaderProps): React.ReactElement => {
  return (
    <div className={`flex cursor-move items-center justify-between widget-drag-handle ${compact ? 'p-1.5' : 'p-2 md:p-2'}`}>
      <div className={`flex items-center ${compact ? 'space-x-1' : 'space-x-1 md:space-x-2'} min-w-0`}>
        {icon && (
          <div className={`text-gray-500 dark:text-slate-400 ${compact ? 'text-[11px]' : 'text-xs md:text-sm'}`}>
            {icon}
          </div>
        )}
        {title && (
          <h3 className={`truncate font-medium text-gray-800 dark:text-slate-100 ${compact ? 'text-[11px]' : 'text-xs md:text-sm'}`}>
            {title}
          </h3>
        )}
        {children}
      </div>
      {onSettingsClick && (
        <button 
          className={`settings-button hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full ${compact ? 'p-0.5' : 'p-0.5 md:p-1'}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onSettingsClick();
          }}
        >
          <Settings size={compact ? 12 : 14} className="text-gray-500 dark:text-slate-400" />
        </button>
      )}
    </div>
  );
};

export default WidgetHeader;
