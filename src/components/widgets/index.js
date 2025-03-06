// Widget Components
import CalendarWidget, { calendarWidgetConfig } from './CalendarWidget';
import WeatherWidget, { weatherWidgetConfig } from './WeatherWidget';
import WorldClocksWidget, { worldClocksWidgetConfig } from './WorldClocksWidget';
import QuickLinksWidget, { quickLinksWidgetConfig } from './QuickLinksWidget';

// Widget Registry - Map of all available widgets
export const widgetComponents = {
  calendar: CalendarWidget,
  weather: WeatherWidget,
  worldclocks: WorldClocksWidget,
  quicklinks: QuickLinksWidget
};

// Widget Configurations - Used for the widget picker and defaults
export const widgetConfigs = [
  calendarWidgetConfig,
  weatherWidgetConfig,
  worldClocksWidgetConfig,
  quickLinksWidgetConfig
];

/**
 * Get widget configuration by type
 * @param {string} type - The widget type
 * @returns {Object} The widget configuration
 */
export const getWidgetConfigByType = (type) => {
  return widgetConfigs.find(config => config.type === type);
};

/**
 * Get widget component by type
 * @param {string} type - The widget type
 * @returns {React.Component} The widget component
 */
export const getWidgetComponent = (type) => {
  return widgetComponents[type] || null;
};

export default {
  widgetComponents,
  widgetConfigs,
  getWidgetConfigByType,
  getWidgetComponent
}; 