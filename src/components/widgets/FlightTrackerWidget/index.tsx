import React, { useState, useEffect, useRef } from 'react';
// Import axios if it's available in the project or add it to dependencies
// import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
// Add imports for Select components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
// Adjust paths for UI components based on the project structure
import WidgetHeader from '../common/WidgetHeader';
import { 
  FlightTrackerWidgetProps, 
  FlightTrackerWidgetConfig, 
  AviationStackResponse,
  AviationStackFlight
} from './types';
import { Plane, Clock, Calendar, AlertCircle, RefreshCw,  ArrowRight, Info, Shield } from 'lucide-react';

/**
 * Size categories for widget content rendering
 * This enum provides clear naming for different widget dimensions
 */
enum WidgetSizeCategory {
  SMALL = 'small',         // 2x2
  WIDE_SMALL = 'wideSmall', // 3x2 
  TALL_SMALL = 'tallSmall', // 2x3
  MEDIUM = 'medium',       // 3x3
  WIDE_MEDIUM = 'wideMedium', // 4x3
  TALL_MEDIUM = 'tallMedium', // 3x4
  LARGE = 'large'          // 4x4
}

/**
 * Flight Tracker Widget Component
 * 
 * This widget allows users to track flights in real-time using the AviationStack API.
 * It displays essential flight information including departure/arrival details and status.
 * 
 * @param {FlightTrackerWidgetProps} props - Component props
 * @returns {JSX.Element} Widget component
 */
const FlightTrackerWidget: React.FC<FlightTrackerWidgetProps> = ({ width, height, config }) => {
  // Default configuration
  const defaultConfig: FlightTrackerWidgetConfig = {
    title: 'Flight Tracker',
    accessKey: '4bf75d0df1c2bfd61231d6281e15a28d', // Default to provided API key
    flightNumber: '',
    flightDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  };

  // Component state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [localConfig, setLocalConfig] = useState<FlightTrackerWidgetConfig>(() => ({
    ...defaultConfig,
    ...config
  }));
  const [flightData, setFlightData] = useState<AviationStackFlight | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sizeCategory, setSizeCategory] = useState<WidgetSizeCategory>(WidgetSizeCategory.SMALL);
  const [isManualRefresh, setIsManualRefresh] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('flight');
  
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Parse flight number into airline code and numeric part
  const parseFlightNumber = (combinedFlightNumber: string): { airlineCode: string, flightNumberOnly: string, isIcao: boolean } => {
    // Default values if parsing fails
    let airlineCode = '';
    let flightNumberOnly = '';
    let isIcao = false;
    
    if (combinedFlightNumber) {
      // Trim any whitespace and convert to uppercase
      const cleanedInput = combinedFlightNumber.trim().toUpperCase();
      
      // Try ICAO pattern first (3 letters + numbers)
      const icaoMatch = cleanedInput.match(/^([A-Z]{3})(\d{1,4})$/);
      
      // Then try IATA pattern (2 letters + numbers)
      const iataMatch = cleanedInput.match(/^([A-Z]{2})(\d{1,4})$/);
      
      if (icaoMatch) {
        airlineCode = icaoMatch[1].toUpperCase();
        flightNumberOnly = icaoMatch[2];
        isIcao = true;
      } else if (iataMatch) {
        airlineCode = iataMatch[1].toUpperCase();
        flightNumberOnly = iataMatch[2];
      } else {
        // If the pattern doesn't match exactly, try a best-effort approach
        // Find where the letters end and the numbers begin
        let i = 0;
        while (i < cleanedInput.length && /[A-Za-z]/.test(cleanedInput[i])) {
          i++;
        }
        
        if (i > 0 && i < cleanedInput.length) {
          airlineCode = cleanedInput.substring(0, i).toUpperCase();
          flightNumberOnly = cleanedInput.substring(i);
          isIcao = airlineCode.length === 3; // Assume 3-letter code is ICAO
        } else {
          console.error(`Failed to parse flight number: ${cleanedInput}`);
        }
      }
    }
    
    return { airlineCode, flightNumberOnly, isIcao };
  };

  // Update widget size category based on width and height
  useEffect(() => {
    if (width <= 2 && height <= 2) {
      setSizeCategory(WidgetSizeCategory.SMALL);
    } else if (width === 3 && height === 2) {
      setSizeCategory(WidgetSizeCategory.WIDE_SMALL);
    } else if (width === 2 && height === 3) {
      setSizeCategory(WidgetSizeCategory.TALL_SMALL);
    } else if (width === 3 && height === 3) {
      setSizeCategory(WidgetSizeCategory.MEDIUM);
    } else if (width === 4 && height === 3) {
      setSizeCategory(WidgetSizeCategory.WIDE_MEDIUM);
    } else if (width === 3 && height === 4) {
      setSizeCategory(WidgetSizeCategory.TALL_MEDIUM);
    } else {
      setSizeCategory(WidgetSizeCategory.LARGE);
    }
  }, [width, height]);

  // Set initial configuration on mount and when config changes
  useEffect(() => {
    if (config) {
      setLocalConfig(prev => ({
        ...prev,
        ...config
      }));
    }
  }, [config]);

  // Update internal flight number parts when the combined flight number changes
  useEffect(() => {
    if (localConfig.flightNumber) {
      const { airlineCode, flightNumberOnly, isIcao } = parseFlightNumber(localConfig.flightNumber);
      
      // Only update if we successfully parsed the flight number
      if (airlineCode && flightNumberOnly) {
        setLocalConfig(prev => ({
          ...prev,
          _airlineCode: airlineCode,
          _flightNumberOnly: flightNumberOnly,
          _isIcao: isIcao
        }));
      }
    }
  }, [localConfig.flightNumber]);

  // Fetch flight data when flight details change or manual refresh is triggered
  useEffect(() => {
    const fetchFlightData = async () => {
      // Don't attempt to fetch without required parameters
      if (!localConfig.accessKey) {
        setError("API access key is required");
        return;
      }

      if (!localConfig.flightNumber || !localConfig._airlineCode || !localConfig._flightNumberOnly) {
        setError("Valid flight number is required");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Build query parameters for the flight search
        const params = new URLSearchParams({
          access_key: localConfig.accessKey
        });

        // Add flight number parameter based on type (IATA or ICAO)
        if (localConfig._isIcao) {
          // Use ICAO flight number
          params.append('flight_icao', localConfig.flightNumber);
        } else {
          // Use IATA flight number
          params.append('flight_iata', localConfig.flightNumber);
        }

        // Add date filter if provided
        if (localConfig.flightDate) {
          params.append('flight_date', localConfig.flightDate);
        }

        // Add airline filter if provided, use the appropriate airline code type
        if (localConfig.airline) {
          if (localConfig.airline.length === 3) {
            params.append('airline_icao', localConfig.airline);
          } else {
            params.append('airline_iata', localConfig.airline);
          }
        }


        // Use a fallback URL for testing if you're having connection issues
        // Remove the "||" part in production for actual API use
        const apiUrl = `https://api.aviationstack.com/v1/flights?${params.toString()}`;
        const useFallback = true; // Set to false to use actual API

        // Array of demo flight codes that will use fallback data
        const demoFlights = ['ASH6040', 'UAL123', 'AAL456', 'DAL789'];
        
        // Check if the current flight number is a demo flight
        if (useFallback && localConfig.flightNumber && demoFlights.includes(localConfig.flightNumber)) {
          // Create mock data for demo flights
          
          // Wait a bit to simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the airline info based on flight code
          let airlineName = 'Unknown Airline';
          let airlineIata = 'XX';
          let airlineIcao = 'XXX';
          let depAirport = 'New York JFK International Airport';
          let depIata = 'JFK';
          let depIcao = 'KJFK';
          let arrAirport = 'Chicago O\'Hare International Airport';
          let arrIata = 'ORD';
          let arrIcao = 'KORD';
          let flightIata = '';
          let flightNumber = '';
          
          // Set airline-specific details based on flight code
          switch(localConfig.flightNumber) {
            case 'ASH6040':
              airlineName = 'Air Shuttle (Mesa Airlines)';
              airlineIata = 'ZV';
              airlineIcao = 'ASH';
              flightNumber = '6040';
              flightIata = 'ZV6040';
              break;
            case 'UAL123':
              airlineName = 'United Airlines';
              airlineIata = 'UA';
              airlineIcao = 'UAL';
              depAirport = 'San Francisco International Airport';
              depIata = 'SFO';
              depIcao = 'KSFO';
              arrAirport = 'Denver International Airport';
              arrIata = 'DEN';
              arrIcao = 'KDEN';
              flightNumber = '123';
              flightIata = 'UA123';
              break;
            case 'AAL456':
              airlineName = 'American Airlines';
              airlineIata = 'AA';
              airlineIcao = 'AAL';
              depAirport = 'Dallas/Fort Worth International Airport';
              depIata = 'DFW';
              depIcao = 'KDFW';
              arrAirport = 'Miami International Airport';
              arrIata = 'MIA';
              arrIcao = 'KMIA';
              flightNumber = '456';
              flightIata = 'AA456';
              break;
            case 'DAL789':
              airlineName = 'Delta Air Lines';
              airlineIata = 'DL';
              airlineIcao = 'DAL';
              depAirport = 'Atlanta Hartsfield-Jackson International Airport';
              depIata = 'ATL';
              depIcao = 'KATL';
              arrAirport = 'Los Angeles International Airport';
              arrIata = 'LAX';
              arrIcao = 'KLAX';
              flightNumber = '789';
              flightIata = 'DL789';
              break;
          }
          
          // Sample flight data structure matching AviationStack format
          const mockData: AviationStackResponse = {
            pagination: {
              limit: 100,
              offset: 0,
              count: 1,
              total: 1
            },
            data: [{
              flight_date: new Date().toISOString().split('T')[0],
              flight_status: 'active',
              departure: {
                airport: depAirport,
                timezone: 'America/New_York',
                iata: depIata,
                icao: depIcao,
                terminal: 'B',
                gate: '22',
                delay: 0,
                scheduled: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                estimated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                actual: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                estimated_runway: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                actual_runway: null
              },
              arrival: {
                airport: arrAirport,
                timezone: 'America/Chicago',
                iata: arrIata,
                icao: arrIcao,
                terminal: '3',
                gate: 'G8',
                delay: 0,
                scheduled: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 minutes from now
                estimated: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
                actual: null,
                estimated_runway: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
                actual_runway: null
              },
              airline: {
                name: airlineName,
                iata: airlineIata,
                icao: airlineIcao
              },
              flight: {
                number: flightNumber,
                iata: flightIata,
                icao: localConfig.flightNumber
              },
              aircraft: {
                registration: 'N915FJ',
                iata: 'E75L',
                icao: 'E75L',
                icao24: 'A1B2C3'
              },
              live: {
                updated: new Date().toISOString(),
                latitude: 41.2619,
                longitude: -84.3436,
                altitude: 31000,
                direction: 270,
                speed_horizontal: 450,
                speed_vertical: 0,
                is_ground: false
              }
            }]
          };
          
          // Make sure data exists before accessing it
          if (mockData.data && mockData.data.length > 0) {
            setFlightData(mockData.data[0]);
            setError(null);
          }
          return;
        }
        
        const response = await fetch(apiUrl, {
          headers: {
            'Content-Type': 'application/json'
          },
          // Add cache control to avoid stale responses
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit exceeded
            throw new Error("API rate limit exceeded. Please try again later.");
          }
          
          if (response.status === 401) {
            // Unauthorized - bad API key
            throw new Error("Invalid API key. Please check your API access key.");
          }
          
          // Get more detailed error information
          let errorInfo = '';
          try {
            const errorData = await response.json();
            errorInfo = JSON.stringify(errorData);
            console.error('API error details:', errorData);
          } catch {
            errorInfo = response.statusText;
          }
          throw new Error(`API error: ${response.status} - ${errorInfo}`);
        }
        
        const data: AviationStackResponse = await response.json();
        
        // Check for API error messages in the response
        if (data.error) {
          throw new Error(`API error: ${data.error.type} - ${data.error.info}`);
        }

        if (data.data && data.data.length > 0) {
          setFlightData(data.data[0]);
          setError(null);
        } else {
          // No data found - log this and provide a more helpful error message
          setError("No flight data found. Try a different flight number or date.");
          setFlightData(null);
        }
      } catch (err) {
        console.error('Error fetching flight data:', err);
        
        // Format user-friendly error message
        let errorMessage = "Failed to fetch flight data";
        
        if (err instanceof Error) {
          const errorText = err.message;
          
          if (errorText.includes('Failed to fetch') || errorText.includes('NetworkError')) {
            errorMessage = "Network request failed. Please check your internet connection and try again.";
          } else if (errorText.includes('rate limit') || errorText.includes('429')) {
            errorMessage = "API rate limit exceeded. Please try again later or get your own API key.";
          } else if (errorText.includes('Invalid API key') || errorText.includes('401')) {
            errorMessage = "Invalid API key. Please check your API access key.";
          } else {
            errorMessage = errorText;
          }
        }
        
        setError(errorMessage);
        setFlightData(null);
      } finally {
        setLoading(false);
        setIsManualRefresh(false); // Reset manual refresh flag
      }
    };

    // Check if all the necessary configuration values are set to fetch data,
    // or if a manual refresh was triggered
    if (isManualRefresh || (localConfig.accessKey && localConfig.flightNumber && 
        localConfig._airlineCode && localConfig._flightNumberOnly)) {
      fetchFlightData();
    }
  }, [
    localConfig.accessKey, 
    localConfig.flightNumber, 
    localConfig._airlineCode, 
    localConfig._flightNumberOnly, 
    localConfig.flightDate, 
    localConfig.airline,
    isManualRefresh // Add isManualRefresh to trigger re-fetch
  ]);

  // Format date and time
  const formatDateTime = (isoDateTimeStr: string): { time: string; date: string } | 'N/A' => {
    if (!isoDateTimeStr) return 'N/A';
    
    const date = new Date(isoDateTimeStr);
    if (isNaN(date.getTime())) return 'N/A';
    
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    };
    
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    
    return {
      time: date.toLocaleTimeString(undefined, timeOptions),
      date: date.toLocaleDateString(undefined, dateOptions)
    };
  };

  // Save settings
  const saveSettings = () => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  };

  // Trigger manual refresh
  const handleManualRefresh = () => {
    setIsManualRefresh(true);
  };

  // Render initial setup view
const renderSetupView = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      {/* Use Plane icon from Lucide with consistent styling */}
      <Plane size={24} className="text-gray-400 mb-3" strokeWidth={1.5}/>
      {/* Consistent text styling */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Enter flight details to start tracking.
      </p>
      {/* Consistent button styling */}
      <Button
        size="sm"
        onClick={() => setShowSettings(true)}
        variant="outline"
      >
        Configure Widget
      </Button>
    </div>
  );
};

// Render error state
  const renderErrorState = () => {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        {/* Use AlertCircle icon for errors */}
        <AlertCircle size={40} className="text-red-500 mb-3" strokeWidth={1.5} />
        {/* Consistent error text styling */}
        <p className="text-sm text-red-500 dark:text-red-400 mb-3">
          {error || "There was an error retrieving flight information"}
        </p>
        {/* Consistent button styling */}
        <Button
          size="sm"
          onClick={handleManualRefresh}
          className="mr-2" // Add margin if needed
        >
          Retry
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSettings(true)}
        >
          Settings
        </Button>
      </div>
    );
  };

  // Render loading state
  const renderLoadingState = () => {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-pulse mb-4 relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:from-opacity-30 dark:to-indigo-900 dark:to-opacity-30 flex items-center justify-center">
            <Plane className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800 border-t-transparent dark:border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading flight details...</p>
        <p className="text-xs text-gray-500 mt-1">Retrieving the latest information</p>
      </div>
    );
  };

  // Render flight information card
  const renderFlightInfoCard = () => {
    if (!flightData) return null;

    const departureDateTime = formatDateTime(flightData.departure.scheduled);
    const arrivalDateTime = formatDateTime(flightData.arrival.scheduled);
    
    // Handle 'N/A' case for date/time formatting
    const depTime = departureDateTime === 'N/A' ? 'N/A' : departureDateTime.time;
    const depDate = departureDateTime === 'N/A' ? 'N/A' : departureDateTime.date;
    const arrTime = arrivalDateTime === 'N/A' ? 'N/A' : arrivalDateTime.time;
    const arrDate = arrivalDateTime === 'N/A' ? 'N/A' : arrivalDateTime.date;
    
    // Determine flight status display (without accent colors and gradients)
    let statusText = flightData.flight_status || "Unknown";
    
    switch (flightData.flight_status?.toLowerCase()) {
      case "scheduled":
        break;
      case "active":
        statusText = "In Flight";
        break;
      case "landed":
        break;
      case "cancelled":
        break;
      case "incident":
        break;
      case "diverted":
        break;
      case "delayed":
        break;
      default:
    }

    // Format delay information in Flighty style
    const departureDelay = flightData.departure.delay 
      ? { minutes: flightData.departure.delay, 
          formatted: `${Math.floor(flightData.departure.delay / 60)}h ${flightData.departure.delay % 60}m` } 
      : null;
    
    const arrivalDelay = flightData.arrival.delay 
      ? { minutes: flightData.arrival.delay, 
          formatted: `${Math.floor(flightData.arrival.delay / 60)}h ${flightData.arrival.delay % 60}m` } 
      : null;

    // Different layout based on widget size
    const isCompact = [WidgetSizeCategory.SMALL].includes(sizeCategory);
    
    // Small widget design (2x2) - Optimized for critical information
    if (isCompact) {
      const isInFlight = flightData.flight_status?.toLowerCase() === 'active';
      const isDelayed = departureDelay !== null || arrivalDelay !== null;
      const delay = departureDelay || arrivalDelay;
      
      return (
        <div className="h-full flex flex-col overflow-hidden">
          {/* Status bar - simplified and informative */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-40">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center h-5 w-5">
                {isInFlight ? <Plane className="h-5 w-5" /> : 
                 isDelayed ? <Clock className="h-5 w-5" /> :
                 <Calendar className="h-5 w-5" />}
              </div>
              <span className="text-sm font-medium">
                {isInFlight ? "In Flight" : 
                 isDelayed ? `Delayed ${delay?.formatted}` : 
                 statusText}
              </span>
            </div>
            <button 
              onClick={handleManualRefresh} 
              className="p-1 rounded-full hover:bg-gray-200 hover:bg-opacity-50 dark:hover:bg-gray-700 dark:hover:bg-opacity-50 transition-colors"
              title="Refresh data"
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Main flight info - compact and prioritized */}
          <div className="flex-1 flex flex-col p-2">
            {/* Flight number and route */}
            <div className="mb-1 pb-1 border-b border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {flightData.flight.iata || flightData.flight.icao || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">
                  {flightData.flight_date}
                </div>
              </div>
            </div>
            
            {/* Origin and destination with times - the most important info */}
            <div className="flex-1 grid grid-cols-2 gap-x-2">
              {/* Departure */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-bold">{flightData.departure.iata || flightData.departure.icao || 'N/A'}</div>
                  <div className="text-sm font-medium mt-0.5">
                    {depTime}
                  </div>
                  {departureDelay && (
                    <div className="text-xs text-orange-500 mt-0.5">
                      +{departureDelay.formatted}
                    </div>
                  )}
                </div>
                
                {/* Terminal/Gate info if available */}
                {(flightData.departure.terminal || flightData.departure.gate) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {flightData.departure.terminal && `T${flightData.departure.terminal}`}
                    {flightData.departure.terminal && flightData.departure.gate && ' • '}
                    {flightData.departure.gate && `Gate ${flightData.departure.gate}`}
                  </div>
                )}
              </div>
              
              {/* Arrival */}
              <div className="flex flex-col justify-between text-right">
                <div>
                  <div className="text-2xl font-bold">{flightData.arrival.iata || flightData.arrival.icao || 'N/A'}</div>
                  <div className="text-sm font-medium mt-0.5">
                    {arrTime}
                  </div>
                  {arrivalDelay && (
                    <div className="text-xs text-orange-500 mt-0.5">
                      +{arrivalDelay.formatted}
                    </div>
                  )}
                </div>
                
                {/* Terminal/Gate info if available */}
                {(flightData.arrival.terminal || flightData.arrival.gate) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {flightData.arrival.terminal && `T${flightData.arrival.terminal}`}
                    {flightData.arrival.terminal && flightData.arrival.gate && ' • '}
                    {flightData.arrival.gate && `Gate ${flightData.arrival.gate}`}
                  </div>
                )}
              </div>
            </div>
            
            {/* Live info if in flight */}
            {isInFlight && flightData.live && (
              <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center text-xs">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse mr-1.5"></div>
                  <span>Live</span>
                </div>
                <div className="text-xs">
                  {Math.round(flightData.live.altitude).toLocaleString()} ft • {Math.round(flightData.live.speed_horizontal)} km/h
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Medium and larger widget designs with information-focused layout
    const isInFlight = flightData.flight_status?.toLowerCase() === 'active';
    const isDelayed = departureDelay !== null || arrivalDelay !== null;
    
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Status bar with clean, information-focused design */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-40">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center h-6 w-6">
              {isInFlight ? <Plane className="h-6 w-6" /> : 
               isDelayed ? <Clock className="h-6 w-6" /> :
               <Calendar className="h-6 w-6" />}
            </div>
            <span className="text-sm font-medium">
              {isInFlight ? "In Flight" : 
               isDelayed ? `Delayed ${departureDelay?.formatted || arrivalDelay?.formatted}` : 
               statusText}
            </span>
            <div className="flex items-center space-x-1.5 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 px-2 py-0.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
              <span>{flightData.flight.iata || flightData.flight.icao}</span>
              <span>•</span>
              <span>{flightData.flight_date}</span>
            </div>
          </div>
          <button 
            onClick={handleManualRefresh} 
            className="p-1.5 rounded-full hover:bg-gray-200 hover:bg-opacity-50 dark:hover:bg-gray-700 dark:hover:bg-opacity-50 transition-colors"
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Main content with improved information layout */}
        <div className="flex-1 overflow-y-auto">
          {/* Flight route map visualization - Keep it clean */}
          <div className="relative bg-gray-50 dark:bg-gray-800 dark:bg-opacity-40 h-32 overflow-hidden border-b border-gray-100 dark:border-gray-800">
            {/* Flight Path Line */}
            <div className="absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-y-1/2">
              <div className="absolute left-0 h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400 transform -translate-y-1/2"></div>
              <div className="absolute right-0 h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400 transform -translate-y-1/2"></div>
              
              {/* Plane Icon that moves along the path based on status */}
              <div 
                className={`absolute h-6 w-6 transform -translate-x-1/2 -translate-y-1/2 ${
                  isInFlight ? 'animate-pulse' : ''
                }`}
                style={{ 
                  left: isInFlight ? '50%' : 
                         flightData.flight_status?.toLowerCase() === 'landed' ? '85%' : '15%',
                  top: '50%'
                }}
              >
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white dark:bg-gray-800 shadow-md">
                  <Plane className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            
            {/* Origin and Destination Labels */}
            <div className="absolute bottom-3 left-[15%] text-center">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{flightData.departure.iata || flightData.departure.icao}</div>
            </div>
            <div className="absolute bottom-3 right-[15%] text-center">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{flightData.arrival.iata || flightData.arrival.icao}</div>
            </div>
          </div>
          
          {/* Core Flight Information - More like a dashboard */}
          <div className="p-3">
            {/* Main Flight Details Card - Streamlined and focused */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
                {/* Departure Side */}
                <div className="p-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Departure</div>
                    {departureDelay && (
                      <div className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30 rounded text-xs text-orange-600 dark:text-orange-400">
                        +{departureDelay.formatted}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-bold mb-1">{flightData.departure.iata || flightData.departure.icao}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{flightData.departure.airport}</div>
                    
                    <div className="flex items-center text-sm mt-2">
                      <Clock className="h-4 w-4 text-blue-500 mr-1.5" />
                      <span className="font-medium">{depTime}</span>
                      <span className="mx-1 text-gray-400">•</span>
                      <span>{depDate}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      {flightData.departure.terminal && (
                        <div className="flex items-center">
                          <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-1.5">
                            T{flightData.departure.terminal}
                          </div>
                        </div>
                      )}
                      {flightData.departure.gate && (
                        <div className="flex items-center">
                          <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            Gate {flightData.departure.gate}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Arrival Side */}
                <div className="p-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">Arrival</div>
                    {arrivalDelay && (
                      <div className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30 rounded text-xs text-orange-600 dark:text-orange-400">
                        +{arrivalDelay.formatted}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-2xl font-bold mb-1">{flightData.arrival.iata || flightData.arrival.icao}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{flightData.arrival.airport}</div>
                    
                    <div className="flex items-center text-sm mt-2">
                      <Clock className="h-4 w-4 text-blue-500 mr-1.5" />
                      <span className="font-medium">{arrTime}</span>
                      <span className="mx-1 text-gray-400">•</span>
                      <span>{arrDate}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      {flightData.arrival.terminal && (
                        <div className="flex items-center">
                          <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs mr-1.5">
                            T{flightData.arrival.terminal}
                          </div>
                        </div>
                      )}
                      {flightData.arrival.gate && (
                        <div className="flex items-center">
                          <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            Gate {flightData.arrival.gate}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Flight and Aircraft Info Row */}
              <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-60 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Plane className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {flightData.airline.name} {flightData.flight.iata || flightData.flight.icao}
                  </span>
                </div>
                
                {flightData.aircraft && flightData.aircraft.registration && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {flightData.aircraft.iata && `${flightData.aircraft.iata} • `}
                    {flightData.aircraft.registration}
                  </div>
                )}
              </div>
            </div>
            
            {/* Live Flight Data - Only show when in flight, prioritized display */}
            {isInFlight && flightData.live && (
              <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-green-100 dark:border-green-900 dark:border-opacity-30 overflow-hidden">
                <div className="px-3 py-2 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border-b border-green-100 dark:border-green-900 dark:border-opacity-30 flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">Live Flight Data</span>
                </div>
                
                <div className="p-3 grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Altitude</div>
                    <div className="text-lg font-bold">
                      {Math.round(flightData.live.altitude).toLocaleString()}
                      <span className="text-xs ml-1 font-normal text-gray-500">ft</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Speed</div>
                    <div className="text-lg font-bold">
                      {Math.round(flightData.live.speed_horizontal)}
                      <span className="text-xs ml-1 font-normal text-gray-500">km/h</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Direction</div>
                    <div className="flex items-center">
                      <div className="text-lg font-bold mr-1">
                        {Math.round(flightData.live.direction)}°
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500 transform" style={{ transform: `rotate(${flightData.live.direction}deg)` }} />
                    </div>
                  </div>
                </div>
                
                <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 flex justify-end">
                  Updated: {new Date(flightData.live.updated).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render main content based on state
  const renderContent = () => {
    // If API key and flight number are not set, show setup view
    if (!localConfig.accessKey && !localConfig.flightNumber) {
      return renderSetupView();
    }
    
    // If there's an error, show error state
    if (error) {
      return renderErrorState();
    }
    
    // If loading, show loading state
    if (loading) {
      return renderLoadingState();
    }
    
    // If flight data is available, show flight info
    if (flightData) {
      return renderFlightInfoCard();
    }
    
    // Default to setup view
    return renderSetupView();
  };
  
  // Settings modal
  const renderSettings = () => {
    const todayFormatted = () => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    };

    return (
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plane className="h-5 w-5 mr-2" />
              <span>Flight Tracker Settings</span>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="flight">
                Flight Info
              </TabsTrigger>
              <TabsTrigger value="widget">
                Widget Options
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="flight" className="space-y-4 py-4">
              {/* Demo Flights - Making this more prominent with Flighty-inspired design */}
              <Card className="border border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-800 dark:bg-opacity-40 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center">
                    <CardTitle className="text-sm">Quick Select Demo Flights</CardTitle>
                    <div className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Recommended</div>
                  </div>
                  <p className="text-xs text-gray-500">These flights work without an API key:</p>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'ASH6040', name: 'Air Shuttle', route: 'JFK → ORD' },
                      { code: 'UAL123', name: 'United', route: 'SFO → DEN' },
                      { code: 'AAL456', name: 'American', route: 'DFW → MIA' },
                      { code: 'DAL789', name: 'Delta', route: 'ATL → LAX' }
                    ].map((flight) => (
                      <Button
                        key={flight.code}
                        variant={localConfig.flightNumber === flight.code ? "default" : "outline"}
                        onClick={() => setLocalConfig({ ...localConfig, flightNumber: flight.code })}
                        className={`h-auto flex-col items-start p-2 ${
                          localConfig.flightNumber === flight.code 
                            ? "bg-gray-800 text-white" 
                            : ""
                        }`}
                      >
                        <span className="font-medium">{flight.code}</span>
                        <span className="text-xs opacity-70">{flight.name}</span>
                        <span className="text-xs opacity-60">{flight.route}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Flight Number */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="flightNumber" className="flex items-center text-sm font-medium">
                    <Plane className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                    Flight Number
                  </Label>
                  <span className="text-red-500 ml-1">*</span>
                </div>
                <Input
                  id="flightNumber"
                  value={localConfig.flightNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig({ ...localConfig, flightNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. AA123 or AXB744"
                  className="border-gray-300 dark:border-gray-600"
                />
                <p className="text-xs text-gray-500">
                  Enter airline code + flight number (e.g., AA123 for IATA or AXB744 for ICAO)
                </p>
                {localConfig.flightNumber && (!localConfig._airlineCode || !localConfig._flightNumberOnly) && (
                  <p className="text-xs text-red-500">
                    Invalid format. Please check your flight number.
                  </p>
                )}
              </div>

              {/* Flight Date with Flighty-inspired design */}
              <div className="space-y-2">
                <Label htmlFor="flightDate" className="flex items-center text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Flight Date
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-auto py-1.5 ${
                      localConfig.flightDate === todayFormatted() ? 
                      "bg-gray-800 text-white border-transparent" : 
                      ""
                    }`}
                    onClick={() => setLocalConfig({...localConfig, flightDate: todayFormatted()})}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-auto py-1.5 ${
                      localConfig.flightDate === (() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toISOString().split('T')[0];
                      })() ? 
                      "bg-gray-800 text-white border-transparent" : 
                      ""
                    }`}
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setLocalConfig({...localConfig, flightDate: tomorrow.toISOString().split('T')[0]});
                    }}
                  >
                    Tomorrow
                  </Button>
                  <Input
                    id="flightDate"
                    type="date"
                    value={localConfig.flightDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig({...localConfig, flightDate: e.target.value})}
                    className="border-gray-300 dark:border-gray-600"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Select or enter the date of the flight
                </p>
              </div>

              {/* API Key with Flighty-inspired design */}
              <div className="space-y-2">
                <Label htmlFor="accessKey" className="flex items-center text-sm font-medium">
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
                  API Key <span className="text-xs text-gray-500 ml-1">(Optional for demo flights)</span>
                </Label>
                <Input
                  id="accessKey"
                  type="password"
                  value={localConfig.accessKey || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig({...localConfig, accessKey: e.target.value})}
                  placeholder="Your AviationStack API key"
                  className="border-gray-300 dark:border-gray-600"
                />
                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    Get a free API key at <a href="https://aviationstack.com/signup/free" target="_blank" rel="noopener noreferrer">AviationStack</a>
                  </p>
                  <p className="flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Free tier is limited to 100 requests per month
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="widget" className="space-y-4 py-4">
              {/* Widget Title */}
              <div className="space-y-2">
                <Label htmlFor="widgetTitle" className="flex items-center text-sm font-medium">
                  <Info className="h-3.5 w-3.5 mr-1.5" />
                  Widget Title
                </Label>
                <Input
                  id="widgetTitle"
                  value={localConfig.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig({...localConfig, title: e.target.value})}
                  placeholder="Flight Tracker"
                  className="border-gray-300 dark:border-gray-600"
                />
                <p className="text-xs text-gray-500">
                  Customize the widget title
                </p>
              </div>
              
              {/* Refresh Rate */}
              <div className="space-y-2">
                <Label htmlFor="refreshRate" className="flex items-center text-sm font-medium">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Auto-Refresh Interval
                </Label>
                {/* Replace native select with shadcn/ui Select */}
                <Select
                  value={localConfig.refreshInterval?.toString() || '0'}
                  onValueChange={(value) =>
                    setLocalConfig({...localConfig, refreshInterval: parseInt(value)})
                  }
                >
                  <SelectTrigger id="refreshRate" className="w-full">
                    <SelectValue placeholder="Select refresh interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Manual refresh only</SelectItem>
                    <SelectItem value="60000">Every minute</SelectItem>
                    <SelectItem value="300000">Every 5 minutes</SelectItem>
                    <SelectItem value="600000">Every 10 minutes</SelectItem>
                    <SelectItem value="1800000">Every 30 minutes</SelectItem>
                    <SelectItem value="3600000">Every hour</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  How often to automatically refresh flight data
                </p>
              </div>
              
              {/* Theme color selection */}

            </TabsContent>
          </Tabs>
          
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
              
              <Button 
                variant="default"
                onClick={() => {
                  saveSettings();
                  setShowSettings(false);
                }}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div ref={widgetRef} className="widget-container h-full flex flex-col">
      <WidgetHeader 
        title={localConfig.title || 'Flight Tracker'} 
        onSettingsClick={() => setShowSettings(true)}
      />
      
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
      
      {/* Settings modal */}
      {renderSettings()}
    </div>
  );
};

export default FlightTrackerWidget; 