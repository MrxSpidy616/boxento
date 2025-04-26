import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import WidgetHeader from '../common/WidgetHeader';
import { YearProgressProps, YearProgressConfig } from './types';

/**
 * A Year Progress Widget that shows all 365 dots efficiently using SVG for better scaling
 * 
 * @param width - Widget width in grid units
 * @param config - Widget configuration
 */
const YearProgressWidget: React.FC<YearProgressProps> = React.memo(({ width, config }) => {
  const defaultConfig: YearProgressConfig = {
    showPercentage: true,
    showDaysLeft: true,
  };

  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState<YearProgressConfig>({
    ...defaultConfig,
    ...config
  });
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    content: string;
    date: string;
    day: number;
    x: number;
    y: number;
  }>({
    show: false,
    content: '',
    date: '',
    day: 0,
    x: 0,
    y: 0
  });

  const widgetRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Detect dark mode using useMemo to reduce recomputation
  const theme = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  }, []);
  
  // Observer for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
          if (newTheme !== theme) {
            // Force re-render using a key in localConfig to avoid creating a state variable
            setLocalConfig(prev => ({ ...prev, _themeKey: Date.now() }));
            break;
          }
        }
      }
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [theme]);

  // Cached progress calculation - computing once on mount
  const progress = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    const daysInYear = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const daysPassed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return {
      total: Math.floor(daysInYear),
      passed: Math.floor(daysPassed),
      percentage: (daysPassed / daysInYear) * 100,
      year: now.getFullYear()
    };
  }, []); // Empty dependency array - only compute once
  
  // Update progress at midnight without full rerender
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Date formatter - created once and memoized
  const dateFormatter = useMemo(() => 
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }),
  []);

  // Pre-calculate all dates for the year in one operation
  const dateCache = useMemo(() => {
    const cache = new Array(progress.total);
    const year = progress.year;
    // Batch date creation in a single loop for better performance
    for (let i = 0; i < progress.total; i++) {
      cache[i] = dateFormatter.format(new Date(year, 0, i + 1));
    }
    return cache;
  }, [dateFormatter, progress.year, progress.total]);

  // Get colors based on theme only - simplified to just handle light/dark mode
  const colors = useMemo(() => ({
    passed: theme === 'dark' ? '#3b82f6' : '#3b82f6', // blue-500
    future: theme === 'dark' ? '#334155' : '#e2e8f0', // dark: slate-700, light: slate-200
  }), [theme]);

  // Calculate optimal grid layout - memoized on width and total days
  const gridLayout = useMemo(() => {
    // Determine columns based on widget size to create a balanced grid
    let cols = 24; // Default
    
    // Only recalculate if width changes
    if (width > 3) {
      cols = 36; // Larger widgets
    } else if (width > 2) {
      cols = 30; // Medium widgets
    }
    
    const rows = Math.ceil(progress.total / cols);
    
    // Pre-calculate values for dot positioning
    const radius = 1.2;
    const spacing = 3.5;
    const viewBoxWidth = (cols * spacing) + (radius * 2) + 2;
    const viewBoxHeight = (rows * spacing) + (radius * 2) + 2;
    
    return { 
      cols, 
      rows,
      radius,
      spacing,
      viewBox: `0 0 ${viewBoxWidth} ${viewBoxHeight}`
    };
  }, [progress.total, width]);

  // Handle tooltip display on hover - optimized to avoid recreating functions
  const handleDotEvents = useMemo(() => ({
    onMouseEnter: (e: React.MouseEvent<SVGCircleElement>, day: number) => {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      
      setTooltip({
        show: true,
        content: `Day ${day} of ${progress.total}`,
        date: dateCache[day - 1],
        day,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
      });
    },
    onMouseLeave: () => {
      setTooltip(prev => ({ ...prev, show: false }));
    }
  }), [dateCache, progress.total]);

  // Virtualization for dots - only render visible dots for smaller screen sizes
  const updateVisibility = useCallback(() => {
    // Empty function - virtualization disabled
  }, []);
  
  // Apply virtualization on scroll or resize
  useEffect(() => {
    // Virtualization disabled - no effect
    return () => {};
  }, [updateVisibility, width]);

  // Generate dots - optimized but ensure all dots are visible
  const dots = useMemo(() => {
    const { cols, radius, spacing } = gridLayout;
    const totalDays = progress.total;
    const dotElements = [];
    
    // Pre-calculate dot classes for reuse
    const passedClass = "transition-colors duration-300 filter drop-shadow-sm";
    const futureClass = "transition-colors duration-300";
    
    // Batch SVG element creation
    for (let i = 0; i < totalDays; i++) {
      const day = i + 1;
      const isPassed = i < progress.passed;
      
      // Calculate position in the grid
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Calculate coordinates
      const cx = (col * spacing) + radius + 1;
      const cy = (row * spacing) + radius + 1;
      
      // Determine fill color - simplified without color schemes
      const fill = isPassed ? colors.passed : colors.future;
      
      // Create the dot element - using direct createElement for performance
      // Ensure visibility by removing any opacity manipulation
      dotElements.push(
        <circle
          key={day}
          cx={cx}
          cy={cy}
          r={radius}
          fill={fill}
          className={isPassed ? passedClass : futureClass}
          data-day={day}
          data-date={dateCache[i]}
          onMouseEnter={(e) => handleDotEvents.onMouseEnter(e, day)}
          onMouseLeave={handleDotEvents.onMouseLeave}
          role="presentation"
          aria-hidden="true"
        />
      );
    }
    
    return dotElements;
  }, [gridLayout, colors, progress.passed, progress.total, dateCache, handleDotEvents]);

  // Update at midnight without full rerender
  useEffect(() => {
    const updateMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        // Update progress reference
        const newNow = new Date();
        const newStart = new Date(newNow.getFullYear(), 0, 1);
        const daysPassed = (newNow.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24);
        
        // Manually update SVG elements without full rerender
        if (svgRef.current) {
          const passedCount = Math.floor(daysPassed);
          const circles = svgRef.current.querySelectorAll('circle');
          
          // Only update the dot that changes state
          if (circles[passedCount - 1]) {
            circles[passedCount - 1].setAttribute('fill', colors.passed);
            circles[passedCount - 1].classList.add('filter', 'drop-shadow-sm');
          }
        }
        
        // Schedule next update
        updateMidnight();
        
        // Only force rerender if stats are shown
        if (localConfig.showDaysLeft || localConfig.showPercentage) {
          setLocalConfig(prev => ({ ...prev, _updateKey: Date.now() }));
        }
      }, timeUntilMidnight);
    };
    
    const midnightTimer = updateMidnight();
    return () => clearTimeout(midnightTimer);
  }, [colors.passed, localConfig.showDaysLeft, localConfig.showPercentage]);

  // Sync config updates
  useEffect(() => {
    if (JSON.stringify(config) !== JSON.stringify(localConfig)) {
      setLocalConfig(prev => ({
        ...prev,
        ...config
      }));
    }
  }, [config]);

  // Memoized stats with caching for performance
  const stats = useMemo(() => {
    if (!localConfig.showDaysLeft && !localConfig.showPercentage) return null;
    
    // Calculate values only when needed
    const daysLeft = progress.total - progress.passed;
    const percentage = progress.percentage.toFixed(1);
    
    // For small widgets, use a more compact layout
    if (width <= 2) {
      return (
        <div className="flex flex-col space-y-1 mt-1 px-0.5 text-xs font-medium">
          {localConfig.showDaysLeft && (
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full transition-colors duration-200 text-center">
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{daysLeft}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">days left</span>
            </div>
          )}
          {localConfig.showPercentage && (
            <div className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full transition-colors duration-200 text-center">
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{percentage}%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">complete</span>
            </div>
          )}
        </div>
      );
    }
    
    // Standard layout for larger widgets
    return (
      <div className="flex justify-between items-center mt-1.5 px-0.5 text-xs font-medium">
        {localConfig.showDaysLeft && (
          <div className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full transition-colors duration-200">
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{daysLeft}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">days left</span>
          </div>
        )}
        {localConfig.showPercentage && (
          <div className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full transition-colors duration-200">
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{percentage}%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">complete</span>
          </div>
        )}
      </div>
    );
  }, [localConfig.showDaysLeft, localConfig.showPercentage, progress.total, progress.passed, progress.percentage, width]);

  // Event handlers with useCallback for stability
  const saveSettings = useCallback(() => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  }, [config, localConfig]);

  const handleSettingsOpen = useCallback(() => {
    setShowSettings(true);
  }, []);

  // Settings dialog - memoized to prevent recreation
  const settingsDialog = useMemo(() => (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Year Progress Settings</DialogTitle>
        </DialogHeader>
        
        {/* Change py-2 to py-4 and space-y-5 to space-y-4 */}
        <div className="space-y-4 py-4">
          {/* Change space-y-3 to space-y-4 */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Display Options</Label>
            {/* Change space-y-3 to space-y-4 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-percentage"
                  checked={localConfig.showPercentage}
                  onCheckedChange={(checked) => 
                    setLocalConfig(prev => ({ ...prev, showPercentage: checked }))
                  }
                />
                <Label htmlFor="show-percentage">Show Percentage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-days"
                  checked={localConfig.showDaysLeft}
                  onCheckedChange={(checked) => 
                    setLocalConfig(prev => ({ ...prev, showDaysLeft: checked }))
                  }
                />
                <Label htmlFor="show-days">Show Days Left</Label>
              </div>
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
              >
                Delete
              </Button>
            )}
            <Button
              variant="default"
              onClick={saveSettings}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ), [showSettings, localConfig, config, saveSettings]);

  return (
    <div ref={widgetRef} className="widget-container h-full flex flex-col">
      <WidgetHeader 
        title="Year Progress" 
        onSettingsClick={handleSettingsOpen}
        aria-labelledby="year-progress-title"
      />
      
      <div className="flex-grow p-1 overflow-hidden">
        <div className="h-full flex flex-col justify-between">
          <div className="flex-grow flex items-center justify-center relative">
            <svg 
              ref={svgRef}
              viewBox={gridLayout.viewBox}
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
              aria-label={`Year progress visualization showing ${progress.passed} days passed out of ${progress.total} days in ${progress.year}`}
              role="img"
            >
              {dots}
            </svg>
            
            {tooltip.show && (
              <div 
                className="absolute px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg pointer-events-none z-10 transform -translate-x-1/2 -translate-y-full transition-opacity duration-150"
                style={{
                  left: `${tooltip.x}px`,
                  top: `${tooltip.y - 10}px`
                }}
              >
                <div className="font-medium">{tooltip.date}</div>
                <div className="text-xs opacity-80">{tooltip.content}</div>
              </div>
            )}
          </div>
          {stats}
        </div>
      </div>
      
      {settingsDialog}
    </div>
  );
});

export default YearProgressWidget; 