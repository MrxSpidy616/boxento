import { useState, useEffect, useRef, type FC, useCallback } from 'react';
import { Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Sun, SunDim, Droplets, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import WidgetHeader from '../../widgets/common/WidgetHeader';
import { WeatherWidgetProps, WeatherData, WeatherWidgetConfig } from './types';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { faviconService } from '@/lib/services/favicon';

/**
 * Weather Widget Component
 * 
 * Displays current weather conditions and forecast.
 * Adapts to different sizes with varying levels of detail:
 * - Smallest (2x2): Temperature, icon, location
 * - Small (3x2): Adds humidity, wind, and feels-like temp
 * - Wide (4x2): Adds horizontal 5-day forecast
 * - Medium (3x3): Adds weather details and vertical forecast
 * - Large (4x4): Complete weather data with detailed forecast
 * 
 * @component
 * @param {WeatherWidgetProps} props - Component props
 * @returns {JSX.Element} Weather widget component
 */
const WeatherWidget: FC<WeatherWidgetProps> = ({ width, height, config, refreshInterval = 15 }) => {
  // State for weather data and UI
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [localConfig, setLocalConfig] = useState<WeatherWidgetConfig>(
    config || { id: '', location: 'New York', units: 'metric' }
  );
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<string>(''); // Track the last config for comparison

  // Mock weather data for development/testing
  const mockWeatherData: WeatherData = {
    location: 'New York',
    temperature: 22,
    feelsLike: 24,
    condition: 'Clear',
    description: 'Clear sky',
    icon: '01d',
    humidity: 65,
    windSpeed: 5.2,
    windDirection: 120,
    sunrise: 1617267900,
    sunset: 1617315780,
    forecast: [
      {
        day: 'Mon',
        temp: { min: 18, max: 24 },
        condition: 'Clear',
        description: 'Clear sky',
        icon: '01d'
      },
      {
        day: 'Tue',
        temp: { min: 17, max: 26 },
        condition: 'Clouds',
        description: 'Few clouds',
        icon: '02d'
      },
      {
        day: 'Wed',
        temp: { min: 19, max: 28 },
        condition: 'Clouds',
        description: 'Scattered clouds',
        icon: '03d'
      },
      {
        day: 'Thu',
        temp: { min: 20, max: 27 },
        condition: 'Rain',
        description: 'Light rain',
        icon: '10d'
      },
      {
        day: 'Fri',
        temp: { min: 18, max: 25 },
        condition: 'Clear',
        description: 'Clear sky',
        icon: '01d'
      }
    ]
  };

  /**
   * Map Open-Meteo's WMO weather codes to weather conditions
   * 
   * @param {number} code - WMO weather code
   * @returns {string} Weather condition
   */
  const mapWeatherCodeToCondition = (code: number): string => {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Mainly Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 56 && code <= 57) return 'Freezing Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 66 && code <= 67) return 'Freezing Rain';
    if (code >= 71 && code <= 75) return 'Snow';
    if (code === 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain';
    if (code >= 85 && code <= 86) return 'Snow';
    if (code === 95) return 'Thunderstorm';
    if (code >= 96 && code <= 99) return 'Thunderstorm';
    return 'Unknown';
  };

  /**
   * Map Open-Meteo's WMO weather codes to detailed descriptions
   * 
   * @param {number} code - WMO weather code
   * @returns {string} Detailed weather description
   */
  const mapWeatherCodeToDescription = (code: number): string => {
    if (code === 0) return 'Clear sky';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45) return 'Fog';
    if (code === 48) return 'Depositing rime fog';
    if (code === 51) return 'Light drizzle';
    if (code === 53) return 'Moderate drizzle';
    if (code === 55) return 'Dense drizzle';
    if (code === 56) return 'Light freezing drizzle';
    if (code === 57) return 'Dense freezing drizzle';
    if (code === 61) return 'Slight rain';
    if (code === 63) return 'Moderate rain';
    if (code === 65) return 'Heavy rain';
    if (code === 66) return 'Light freezing rain';
    if (code === 67) return 'Heavy freezing rain';
    if (code === 71) return 'Slight snow fall';
    if (code === 73) return 'Moderate snow fall';
    if (code === 75) return 'Heavy snow fall';
    if (code === 77) return 'Snow grains';
    if (code === 80) return 'Slight rain showers';
    if (code === 81) return 'Moderate rain showers';
    if (code === 82) return 'Violent rain showers';
    if (code === 85) return 'Slight snow showers';
    if (code === 86) return 'Heavy snow showers';
    if (code === 95) return 'Thunderstorm';
    if (code === 96) return 'Thunderstorm with slight hail';
    if (code === 99) return 'Thunderstorm with heavy hail';
    return 'Unknown weather condition';
  };

  // Memoize the fetchWeather function to prevent unnecessary re-renders
  const fetchWeather = useCallback(async () => {
    setLoading(true);
    
    try {
      const location = localConfig.location || 'New York';
      const useMetric = localConfig.units !== 'imperial';
      
      // First, get coordinates for the location using Open-Meteo's geocoding API
      const geocodingResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      
      if (!geocodingResponse.ok) {
        throw new Error(`Geocoding API error: ${geocodingResponse.statusText}`);
      }
      
      const geocodingData = await geocodingResponse.json();
      
      if (!geocodingData.results || geocodingData.results.length === 0) {
        throw new Error(`Location not found: ${location}`);
      }
      
      const { latitude, longitude, name } = geocodingData.results[0];
      
      // Now fetch weather data using Open-Meteo's forecast API
      const temperatureUnit = useMetric ? 'celsius' : 'fahrenheit';
      const windSpeedUnit = useMetric ? 'kmh' : 'mph';
      
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
        `&temperature_unit=${temperatureUnit}&wind_speed_unit=${windSpeedUnit}` +
        `&forecast_days=5&timezone=auto`
      );
      
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.statusText}`);
      }
      
      const weatherData = await weatherResponse.json();
      
      // Process forecast data to match our format
      const forecast = weatherData.daily.time.map((date: string, index: number) => {
        const weatherCode = weatherData.daily.weather_code[index];
        return {
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          temp: {
            min: weatherData.daily.temperature_2m_min[index],
            max: weatherData.daily.temperature_2m_max[index]
          },
          condition: mapWeatherCodeToCondition(weatherCode),
          description: mapWeatherCodeToDescription(weatherCode),
          icon: `${weatherCode}`
        };
      });
      
      // Get current weather data
      const currentWeatherCode = weatherData.current.weather_code;
      
      setWeather({
        location: name,
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        condition: mapWeatherCodeToCondition(currentWeatherCode),
        description: mapWeatherCodeToDescription(currentWeatherCode),
        icon: `${currentWeatherCode}`,
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: weatherData.current.wind_speed_10m,
        windDirection: weatherData.current.wind_direction_10m,
        sunrise: Date.parse(weatherData.daily.sunrise[0]) / 1000,
        sunset: Date.parse(weatherData.daily.sunset[0]) / 1000,
        forecast
      });
      
      setLoading(false);
      setUnit(useMetric ? 'celsius' : 'fahrenheit');
      setError(null);
    } catch (err) {
      console.error('[WeatherWidget] Error:', err);
      setError('Failed to fetch weather data');
      setLoading(false);
      
      // Use mock data if available
      if (mockWeatherData) {
        setWeather(mockWeatherData);
        setLoading(false);
      }
    }
  }, [localConfig.location, localConfig.units]); // Only depend on location and units

  // Update localConfig when config changes without creating a circular dependency
  useEffect(() => {
    if (config) {
      // Create a config signature to detect real changes
      const configSignature = `${config.id}-${config.location}-${config.units}`;
      
      // Only update if there's a real change and not just a re-render
      if (configSignature !== configRef.current) {
        console.log(`[WeatherWidget] Config changed to ${config.location}`);
        configRef.current = configSignature;
        setLocalConfig(config);
      }
    }
  }, [config]);

  // Combine both useEffects into one
  useEffect(() => {
    // Initial fetch
    fetchWeather();
    
    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      const interval = setInterval(fetchWeather, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchWeather, refreshInterval]); // Only depend on memoized fetchWeather and refreshInterval

  // Fix the radio group value change handler
  const handleUnitsChange = useCallback((value: 'metric' | 'imperial') => {
    setLocalConfig(prev => ({...prev, units: value}));
  }, []);

  /**
   * Format temperature with unit
   * 
   * @param {number} temp - Temperature value
   * @returns {string} Formatted temperature with unit
   */
  const formatTemperature = (temp: number): string => {
    const roundedTemp = Math.round(temp);
    return `${roundedTemp}°${unit === 'celsius' ? 'C' : 'F'}`;
  };

  /**
   * Helper function to get the appropriate weather icon
   * 
   * @param {string} condition - Weather condition (clear, rain, cloudy, etc.)
   * @param {string} [icon] - Optional icon code from the API
   * @returns {React.ReactElement} Weather icon component
   */
  const getWeatherIcon = (condition: string, icon?: string): React.ReactElement => {
    // Default size and style
    const defaultSize = 24;
    const className = "text-gray-700 dark:text-gray-300";
    
    // Get WMO weather code if provided
    const weatherCode = icon ? parseInt(icon) : null;
    
    // Check if it's day or night (for Open-Meteo we'll default to day)
    const isNight = false;
    
    // Map icons based on weather codes or condition
    if (weatherCode !== null) {
      if (weatherCode === 0) 
        return isNight ? <SunDim size={defaultSize} className={className} /> : <Sun size={defaultSize} className={className} />;
      
      if (weatherCode === 1 || weatherCode === 2) 
        return <Cloud size={defaultSize} className={className} />;
      
      if (weatherCode === 3) 
        return <Cloud size={defaultSize} className={className} />;
      
      if (weatherCode === 45 || weatherCode === 48) 
        return <Wind size={defaultSize} className={className} />;
      
      if (weatherCode >= 51 && weatherCode <= 57) 
        return <CloudRain size={defaultSize} className={className} />;
      
      if (weatherCode >= 61 && weatherCode <= 67) 
        return <CloudRain size={defaultSize} className={className} />;
      
      if (weatherCode >= 71 && weatherCode <= 77) 
        return <CloudSnow size={defaultSize} className={className} />;
      
      if (weatherCode >= 80 && weatherCode <= 82) 
        return <CloudRain size={defaultSize} className={className} />;
      
      if (weatherCode >= 85 && weatherCode <= 86) 
        return <CloudSnow size={defaultSize} className={className} />;
      
      if (weatherCode >= 95 && weatherCode <= 99) 
        return <CloudLightning size={defaultSize} className={className} />;
    }
    
    // Fallback to condition string if no valid weather code
    switch (condition.toLowerCase()) {
      case 'clear':
        return isNight ? <SunDim size={defaultSize} className={className} /> : <Sun size={defaultSize} className={className} />;
      case 'mainly clear':
      case 'partly cloudy':
      case 'overcast':
      case 'clouds':
        return <Cloud size={defaultSize} className={className} />;
      case 'rain':
      case 'drizzle':
      case 'freezing drizzle':
      case 'freezing rain':
        return <CloudRain size={defaultSize} className={className} />;
      case 'snow':
        return <CloudSnow size={defaultSize} className={className} />;
      case 'thunderstorm':
        return <CloudLightning size={defaultSize} className={className} />;
      case 'fog':
      case 'mist':
      case 'haze':
        return <Wind size={defaultSize} className={className} />;
      default:
        return <Cloud size={defaultSize} className={className} />;
    }
  };

  /**
   * Loading component for all views
   * 
   * @returns {JSX.Element} Loading indicator
   */
  const renderLoading = () => {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-pulse rounded-full bg-gray-200 bg-opacity-50 dark:bg-gray-700 dark:bg-opacity-50 h-10 w-10"></div>
      </div>
    );
  };

  /**
   * Error component for all views
   * 
   * @returns {JSX.Element} Error indicator
   */
  const renderError = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-3 text-center">
        <Info className="text-amber-500 mb-2" size={24} />
        <p className="text-sm text-amber-500 mb-1">{error}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Check your location or try again later.
        </p>
      </div>
    );
  };

  /**
   * Renders the minimal view for smallest widget size (2x2)
   * Displays just the essential information: current temperature, weather icon and location
   * 
   * @returns {JSX.Element} Minimal view
   */
  const renderMinimalView = () => {
    if (!weather) return null;
    
    return (
      <div className="flex flex-col items-center justify-center h-full px-2 py-3">
        <div className="mb-1">
          {getWeatherIcon(weather.condition, weather.icon)}
        </div>
        <div className="text-2xl font-medium tracking-tight">
          {formatTemperature(weather.temperature)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {weather.location}
        </div>
      </div>
    );
  };

  /**
   * Renders a compact view with essential weather details
   * Adds feels-like temperature, humidity and wind speed to the basic view
   * 
   * @returns {JSX.Element} Compact layout view
   */
  const renderCompactView = () => {
    if (!weather) return null;
    
    return (
      <div className="flex h-full p-3">
        <div className="flex flex-col justify-center items-start flex-1">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">
            {weather.location}
          </div>
          <div className="flex items-center">
            <span className="text-2xl font-medium tracking-tight mr-2">
              {formatTemperature(weather.temperature)}
            </span>
            {getWeatherIcon(weather.condition, weather.icon)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {weather.condition}
          </div>
        </div>
        
        <div className="flex flex-col justify-center items-end text-right space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <span className="mr-1">Feels</span> 
            <span className="font-medium">{formatTemperature(weather.feelsLike)}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Droplets size={12} className="mr-1" /> 
            <span className="font-medium">{weather.humidity}%</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Wind size={12} className="mr-1" /> 
            <span className="font-medium">{weather.windSpeed}</span>
            <span className="ml-1">{unit === 'celsius' ? 'm/s' : 'mph'}</span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders a horizontal forecast view for wider widgets
   * Shows current conditions and a 5-day forecast in a horizontal layout
   * 
   * @returns {JSX.Element} Horizontal forecast view
   */
  const renderHorizontalForecastView = () => {
    if (!weather) return null;
    
    return (
      <div className="flex flex-col h-full p-3">
        <div className="flex items-center mb-3">
          <div className="mr-3">
            {getWeatherIcon(weather.condition, weather.icon)}
          </div>
          <div>
            <div className="text-xl font-medium tracking-tight">
              {formatTemperature(weather.temperature)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {weather.location}
            </div>
          </div>
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            Feels like {formatTemperature(weather.feelsLike)}
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex space-x-2 h-full">
            {weather.forecast.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center justify-between py-2 px-1">
                <div className="text-xs font-medium">{day.day}</div>
                <div className="py-1">
                  {getWeatherIcon(day.condition, day.icon)}
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium">
                    {Math.round(day.temp.max)}°
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {Math.round(day.temp.min)}°
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders a vertical forecast view for medium-sized widgets
   * Includes current conditions, weather metrics, and a vertical 5-day forecast
   * 
   * @returns {JSX.Element} Vertical forecast view
   */
  const renderVerticalForecastView = () => {
    if (!weather) return null;
    
    // Calculate sunrise and sunset times
    const sunriseTime = new Date(weather.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sunsetTime = new Date(weather.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    return (
      <div className="flex flex-col h-full p-3">
        <div className="mb-3">
          <div className="text-sm font-medium truncate mb-1">{weather.location}</div>
          <div className="flex items-end">
            <div className="text-3xl font-medium tracking-tight mr-2">
              {formatTemperature(weather.temperature)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Feels like {formatTemperature(weather.feelsLike)}
            </div>
            <div className="ml-auto">
              {getWeatherIcon(weather.condition, weather.icon)}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {weather.description}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-md p-2 text-center">
            <div className="text-xs text-gray-500 ">Humidity</div>
            <div className="text-sm font-medium mt-1">{weather.humidity}%</div>
          </div>
          <div className="rounded-md p-2 text-center">
            <div className="text-xs text-gray-500 ">Wind</div>
            <div className="text-sm font-medium mt-1">{weather.windSpeed} {unit === 'celsius' ? 'm/s' : 'mph'}</div>
          </div>
          <div className="rounded-md p-2 text-center">
            <div className="text-xs text-gray-500">Sunrise/Sunset</div>
            <div className="text-xs font-medium mt-1">{sunriseTime} / {sunsetTime}</div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="text-xs font-medium mb-2">5-Day Forecast</div>
          <div className="space-y-2">
            {weather.forecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between rounded-md py-2 px-3">
                <div className="text-xs font-medium w-10">{day.day}</div>
                <div className="flex-1 flex justify-center">
                  {getWeatherIcon(day.condition, day.icon)}
                </div>
                <div className="text-xs w-16 text-right">
                  <span className="font-medium">{Math.round(day.temp.max)}°</span>
                  <span className="text-gray-400 ml-1">{Math.round(day.temp.min)}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders the full-size detailed view for large widgets
   * Comprehensive display with current conditions, detailed metrics, and complete forecast
   * 
   * @returns {JSX.Element} Full-size detailed view
   */
  const renderDetailedView = () => {
    if (!weather) return null;
    
    // Get current date and time
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Calculate sunrise and sunset times
    const sunriseTime = new Date(weather.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sunsetTime = new Date(weather.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-lg font-medium">{weather.location}</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentDate} • {currentTime}
            </div>
            <div className="text-sm mt-1">
              {weather.description}
            </div>
          </div>
          <div className="text-right flex items-center">
            <div className="mr-3">
              {getWeatherIcon(weather.condition, weather.icon)}
            </div>
            <div>
              <div className="text-3xl font-medium tracking-tight">
                {formatTemperature(weather.temperature)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Feels like {formatTemperature(weather.feelsLike)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="rounded-md p-3">
            <div className="text-xs text-gray-500 mb-1">Humidity</div>
            <div className="text-lg font-medium">{weather.humidity}%</div>
          </div>
          <div className="rounded-md p-3">
            <div className="text-xs text-gray-500 mb-1">Wind</div>
            <div className="text-lg font-medium">{weather.windSpeed} {unit === 'celsius' ? 'm/s' : 'mph'}</div>
          </div>
          <div className="rounded-md p-3">
            <div className="text-xs text-gray-500 mb-1">Sunrise</div>
            <div className="text-lg font-medium">{sunriseTime}</div>
          </div>
          <div className="rounded-md p-3">
            <div className="text-xs text-gray-500 mb-1">Sunset</div>
            <div className="text-lg font-medium">{sunsetTime}</div>
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-3">5-Day Forecast</h4>
          <div className="grid grid-cols-5 gap-3">
            {weather.forecast.map((day, index) => (
              <div key={index} className="rounded-md p-3 flex flex-col items-center">
                <div className="text-sm font-medium mb-2">{day.day}</div>
                <div className="mb-2">
                  {getWeatherIcon(day.condition, day.icon)}
                </div>
                <div className="text-sm font-medium">
                  {Math.round(day.temp.max)}°
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {Math.round(day.temp.min)}°
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  {day.condition}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Determines which view to render based on widget dimensions
   * Adapts the content display to make optimal use of available space
   * 
   * @returns {JSX.Element} The appropriate view for the current dimensions
   */
  const renderContent = () => {
    if (error) {
      return renderError();
    }
    
    if (loading) {
      return renderLoading();
    }
    
    // Determine which view to render based on available space
    // Using a more nuanced approach to sizing
    if (width >= 4 && height >= 4) {
      return renderDetailedView();
    } else if (width >= 3 && height >= 3) {
      return renderVerticalForecastView();
    } else if (width >= 4 && height >= 2) {
      return renderHorizontalForecastView();
    } else if (width >= 3 && height >= 2) {
      return renderCompactView();
    } else {
      return renderMinimalView();
    }
  };

  /**
   * Renders the settings content for the modal
   * 
   * @returns {JSX.Element} Settings content
   */
  const renderSettingsContent = () => {
  return (
    // Remove the outer fragment <>...</>
    // The wrapping div with space-y-4 is now applied where this function is called
    <>
      <div className="space-y-2">
        <Label htmlFor="location-input">Location</Label>
        <Input
          id="location-input"
          type="text"
          placeholder="Enter city name"
          value={localConfig.location || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({...prev, location: e.target.value}))}
        />
      </div>

      <div className="space-y-2">
        <Label>Temperature Units</Label>
        <RadioGroup
          value={localConfig.units || 'metric'}
          onValueChange={handleUnitsChange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="metric" id="metric" />
            <Label htmlFor="metric">Celsius (°C)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="imperial" id="imperial" />
            <Label htmlFor="imperial">Fahrenheit (°F)</Label>
          </div>
        </RadioGroup>
      </div>
    </>
    // Remove the closing fragment </>
  );
};

  /**
   * Renders the settings footer
   * 
   * @returns {JSX.Element} Settings footer
   */
  const renderSettingsFooter = () => {
    return (
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
        
        <div className="flex">
          <Button
            variant="default"
            onClick={() => {
              // Save settings via onUpdate callback (will use configManager in App.tsx)
              if (config?.onUpdate) {
                console.log('[WeatherWidget] Saving local config to parent component');
                config.onUpdate(localConfig);
              }
              
              // Apply the local config settings
              setUnit(localConfig.units === 'imperial' ? 'fahrenheit' : 'celsius');
              setIsSettingsOpen(false);
              
              // Trigger a weather refresh with new settings
              console.log('[WeatherWidget] Triggering weather refresh with new settings');
              setLoading(true);
              
              // Short delay to ensure all state updates are processed
              setTimeout(() => {
                fetchWeather();
              }, 300);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    );
  };

  // Update favicon when weather data changes
  useEffect(() => {
    if (weather && !loading && !error) {
      // Update favicon with current temperature
      faviconService.updateWeatherInfo(Math.round(weather.temperature));
    }
  }, [weather, loading, error, localConfig.units]);

  // Clean up favicon when component unmounts
  useEffect(() => {
    return () => {
      faviconService.clearWeatherInfo();
    };
  }, []);

  return (
    <div ref={widgetRef} className="widget-container h-full flex flex-col">
      <WidgetHeader 
        title="Weather" 
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      
      <div className="flex-1 overflow-hidden rounded-md m-1">
        {renderContent()}
      </div>
      
      {isSettingsOpen && (
        <Dialog open={isSettingsOpen} onOpenChange={(open: boolean) => setIsSettingsOpen(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Weather Settings</DialogTitle>
            </DialogHeader>
            {/* Add a div with space-y-4 inside the py-4 container */}
            <div className="py-4">
              <div className="space-y-4">
                {renderSettingsContent()}
              </div>
            </div>
            <DialogFooter>
              {renderSettingsFooter()}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Fix export issue by explicitly exporting the component
export { WeatherWidget };
export default WeatherWidget;