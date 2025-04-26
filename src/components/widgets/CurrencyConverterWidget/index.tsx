import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { Input } from '@/components/ui/input';
import WidgetHeader from '../common/WidgetHeader';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useSharedCredential } from '@/lib/sharedCredentials';
import { Switch } from "../../ui/switch";
import { Checkbox } from "../../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import type { CurrencyConverterWidgetProps, CurrencyConverterWidgetConfig } from './types';
// Add DollarSign icon import
// Add AlertCircle import
import { AlertCircle, BadgeCent } from 'lucide-react';

// Comprehensive currency database
// This includes all currencies supported by Open Exchange Rates
const CURRENCIES: Record<string, { name: string; symbol: string }> = {
  // ... existing currencies ...
};

// Common currencies to show at the top of selection lists
const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD', 'SEK',
  'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL', 'TWD'
];

// Custom hook for fetching exchange rates
const useExchangeRates = (apiKey: string | undefined, baseCurrency: string = 'USD', autoRefresh: boolean = false, refreshInterval: number = 60) => {
  const [rates, setRates] = React.useState<{[key: string]: number}>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  
  // More robust fetchRates function with better error handling and debugging
  const fetchRates = React.useCallback(async () => {
    // Clear previous errors when starting a new fetch
    setError(null);
    setLoading(true);
    
    // Debug: Log fetch attempt with API key (masked for security)
    console.log(`[CurrencyConverter] Fetching rates with API key: ${apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none'}`);
    
    if (!apiKey) {
      console.error('[CurrencyConverter] No API key provided');
      setError('API key is required');
      setLoading(false);
      return;
    }
    
    try {
      // Use the app ID and base currency to construct the URL
      const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey || ''}`;
      
      // Log the URL without exposing the API key
      console.log('[CurrencyConverter] Fetching from: https://openexchangerates.org/api/latest.json?app_id=API_KEY_HIDDEN');
      
      const response = await fetch(url);
      
      // Check if the response is OK
      if (!response.ok) {
        // Try to get more specific error information from response
        const errorData = await response.json().catch(() => null);
        console.error(`[CurrencyConverter] API returned ${response.status}: `, errorData);
        
        if (response.status === 401 || response.status === 403) {
          setError('Invalid API key. Please check your API key and try again.');
        } else if (response.status === 429) {
          setError('Rate limit exceeded. Please try again later.');
        } else {
          setError(`API error: ${response.status} ${response.statusText}`);
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Check if we have rates in the response
      if (!data.rates) {
        console.error('[CurrencyConverter] No rates found in response:', data);
        setError('Invalid response from API. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('[CurrencyConverter] Rates fetched successfully:', Object.keys(data.rates).length, 'currencies');
      setRates(data.rates);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[CurrencyConverter] Error fetching rates:', err);
      setError('Failed to fetch rates. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);
  
  // Initial fetch and when api key or base currency changes
  React.useEffect(() => {
    console.log('[CurrencyConverter] API key or base currency changed:', { 
      hasApiKey: !!apiKey,
      baseCurrency 
    });
    
    if (apiKey) {
      console.log('[CurrencyConverter] Fetching rates with API key');
      fetchRates();
    } else {
      console.log('[CurrencyConverter] No API key available, skipping fetch');
      setError('API key is required');
    }
  }, [apiKey, baseCurrency, fetchRates]);
  
  // Auto-refresh
  React.useEffect(() => {
    if (!autoRefresh || !apiKey) return;
    
    const intervalId = setInterval(() => {
      console.log('[CurrencyConverter] Auto-refreshing rates');
      fetchRates();
    }, refreshInterval * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchRates, apiKey]);
  
  return { 
    rates, 
    loading, 
    error, 
    lastUpdated,
    refetch: fetchRates
  };
};

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
 * Currency Converter Widget Component
 * 
 * A widget that allows users to convert between currencies using Open Exchange Rates API.
 * 
 * @param {CurrencyConverterWidgetProps} props - Component props
 * @returns {JSX.Element} Widget component
 */
const CurrencyConverterWidget: React.FC<CurrencyConverterWidgetProps> = ({ width, height, config = {} }) => {
  const [amount, setAmount] = React.useState('1');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('general');
  const [showSettings, setShowSettings] = React.useState(false);
  const [localConfig, setLocalConfig] = React.useState<CurrencyConverterWidgetConfig>({
    title: 'Currency Converter',
    baseCurrency: 'USD',
    targetCurrencies: ['EUR', 'GBP', 'JPY'],
    useSharedCredential: false,
    autoRefresh: false,
    refreshInterval: 60,
    ...config
  });

  // Access shared credentials
  const { credential: sharedApiKey, updateCredential: updateSharedApiKey } = useSharedCredential('openexchangerates-api');

  // Use exchange rates hook
  const { rates, loading, error, refetch } = useExchangeRates(
    localConfig.useSharedCredential ? sharedApiKey || undefined : localConfig.apiKey,
    localConfig.baseCurrency,
    localConfig.autoRefresh,
    localConfig.refreshInterval
  );

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  // Save settings
  const saveSettings = () => {
    if (localConfig.useSharedCredential && sharedApiKey) {
      updateSharedApiKey(sharedApiKey);
    }
    
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    
    setShowSettings(false);
    setTimeout(() => {
      if (localConfig.useSharedCredential ? sharedApiKey : localConfig.apiKey) {
        refetch();
      }
    }, 1500);
  };

  // Handle widget deletion
  const handleDelete = () => {
    if (config?.onDelete) {
      config.onDelete();
    }
    setShowSettings(false);
  };

  // Render settings dialog
  const renderSettings = () => (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Currency Converter Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="currencies">Currencies</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="title-input">Widget Title</Label>
                <Input
                  id="title-input"
                  value={localConfig.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="base-currency-select">Base Currency</Label>
                <Select
                  value={localConfig.baseCurrency || 'USD'}
                  onValueChange={(value: string) => setLocalConfig(prev => ({ ...prev, baseCurrency: value }))}
                >
                  <SelectTrigger id="base-currency-select">
                    <SelectValue placeholder="Select base currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map(code => (
                      <SelectItem key={code} value={code}>
                        {code} - {CURRENCIES[code as keyof typeof CURRENCIES]?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="currencies" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <div className="flex justify-between items-center">
                  <Label>Target Currencies</Label>
                  <span className="text-xs text-muted-foreground">
                    Selected: {localConfig.targetCurrencies?.length || 0}
                  </span>
                </div>
                
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  placeholder="Search currencies..."
                  className="mb-2"
                />
                
                <div className="h-36 overflow-y-auto border rounded-md">
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {POPULAR_CURRENCIES.map(code => (
                      <div key={code} className="flex items-center space-x-2">
                        <Checkbox
                          id={`currency-${code}`}
                          checked={localConfig.targetCurrencies?.includes(code) || false}
                          onCheckedChange={(checked: boolean) => {
                            const currentTargets = localConfig.targetCurrencies || [];
                            setLocalConfig(prev => ({
                              ...prev,
                              targetCurrencies: checked
                                ? [...currentTargets, code]
                                : currentTargets.filter(c => c !== code)
                            }));
                          }}
                        />
                        <Label htmlFor={`currency-${code}`} className="text-sm">
                          {code}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="use-shared-credential"
                  checked={localConfig.useSharedCredential || false}
                  onCheckedChange={(checked: boolean) => setLocalConfig(prev => ({ ...prev, useSharedCredential: checked }))}
                />
                <Label htmlFor="use-shared-credential">Use Shared API Key</Label>
              </div>

              {localConfig.useSharedCredential ? (
                <div className="grid w-full items-center gap-1.5">
                  <Label>Shared API Key</Label>
                  <Input
                    type="password"
                    value={sharedApiKey || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSharedApiKey(e.target.value)}
                    placeholder="Enter shared API key"
                  />
                  <p className="text-sm text-muted-foreground">
                    Get your free API key at <a href="https://openexchangerates.org/signup" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openexchangerates.org</a>
                  </p>
                </div>
              ) : (
                <div className="grid w-full items-center gap-1.5">
                  <Label>Private API Key</Label>
                  <Input
                    type="password"
                    value={localConfig.apiKey || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter your Open Exchange Rates API key"
                  />
                  <p className="text-sm text-muted-foreground">
                    Get your free API key at <a href="https://openexchangerates.org/signup" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openexchangerates.org</a>
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Switch
                  id="auto-refresh"
                  checked={localConfig.autoRefresh || false}
                  onCheckedChange={(checked: boolean) => setLocalConfig(prev => ({ ...prev, autoRefresh: checked }))}
                />
                <Label htmlFor="auto-refresh">Auto Refresh</Label>
              </div>
              
              {localConfig.autoRefresh && (
                <div className="grid grid-cols-2 items-center gap-2">
                  <Label>Refresh Interval (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={localConfig.refreshInterval || 60}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({
                      ...prev,
                      refreshInterval: parseInt(e.target.value) || 60
                    }))}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <div className="flex justify-between w-full">
            {config?.onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                aria-label="Delete this widget"
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
  );

  /**
   * Determines the appropriate size category based on width and height
   */
  const getWidgetSizeCategory = (width: number, height: number): WidgetSizeCategory => {
    if (width >= 4 && height >= 4) {
      return WidgetSizeCategory.LARGE;
    } else if (width >= 4 && height >= 3) {
      return WidgetSizeCategory.WIDE_MEDIUM;
    } else if (width >= 3 && height >= 4) {
      return WidgetSizeCategory.TALL_MEDIUM;
    } else if (width >= 3 && height >= 3) {
      return WidgetSizeCategory.MEDIUM;
    } else if (width >= 3 && height >= 2) {
      return WidgetSizeCategory.WIDE_SMALL;
    } else if (width >= 2 && height >= 3) {
      return WidgetSizeCategory.TALL_SMALL;
    } else {
      return WidgetSizeCategory.SMALL;
    }
  };

  // Render content based on widget size
  const renderContent = () => {
    const sizeCategory = getWidgetSizeCategory(width, height);
    
    switch (sizeCategory) {
      case WidgetSizeCategory.LARGE:
        return renderLargeView();
      case WidgetSizeCategory.WIDE_MEDIUM:
        return renderWideMediumView();
      case WidgetSizeCategory.TALL_MEDIUM:
        return renderTallMediumView();
      case WidgetSizeCategory.MEDIUM:
        return renderMediumView();
      case WidgetSizeCategory.WIDE_SMALL:
        return renderWideSmallView();
      case WidgetSizeCategory.TALL_SMALL:
        return renderTallSmallView();
      case WidgetSizeCategory.SMALL:
      default:
        return renderSmallView();
    }
  };

  // Small View (2x2) - Most critical information only
  const renderSmallView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="block text-2xl font-semibold">-</span>
            <span className="text-xs text-muted-foreground">No currencies selected</span>
          </div>
        </div>
      );
    }

    const primaryCurrency = localConfig.targetCurrencies[0];
    const rate = rates[primaryCurrency] || 0;
    const numericAmount = parseFloat(amount) || 0;
    const value = (numericAmount * rate).toFixed(2);

    return (
      <div className="flex items-center justify-center h-full p-2">
        <div className="text-center">
          <span className="block text-2xl font-semibold">
            {CURRENCIES[primaryCurrency as keyof typeof CURRENCIES]?.symbol}
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{primaryCurrency}</span>
        </div>
      </div>
    );
  };

  // Wide Small View (3x2)
  const renderWideSmallView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return renderSmallView();
    }

    const currencies = localConfig.targetCurrencies.slice(0, 2);
    const numericAmount = parseFloat(amount) || 0;

    return (
      <div className="flex justify-around items-center h-full p-2">
        {currencies.map(currency => {
          const rate = rates[currency] || 0;
          const value = (numericAmount * rate).toFixed(2);
          return (
            <div key={currency} className="text-center">
              <span className="block text-2xl font-semibold">
                {CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol}
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Tall Small View (2x3)
  const renderTallSmallView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return renderSmallView();
    }

    const currencies = localConfig.targetCurrencies.slice(0, 2);
    const numericAmount = parseFloat(amount) || 0;

    return (
      <div className="flex flex-col justify-around items-center h-full p-2">
        {currencies.map(currency => {
          const rate = rates[currency] || 0;
          const value = (numericAmount * rate).toFixed(2);
          return (
            <div key={currency} className="text-center">
              <span className="block text-2xl font-semibold">
                {CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol}
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Medium View (3x3)
  const renderMediumView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return renderSmallView();
    }

    const currencies = localConfig.targetCurrencies.slice(0, 4);
    const numericAmount = parseFloat(amount) || 0;

    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full p-2">
        {currencies.map(currency => {
          const rate = rates[currency] || 0;
          const value = (numericAmount * rate).toFixed(2);
          return (
            <div key={currency} className="flex flex-col items-center justify-center bg-card text-card-foreground rounded-md p-3 border shadow-sm">
              <span className="text-2xl font-semibold">
                {CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol}
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Wide Medium View (4x3)
  const renderWideMediumView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return renderMediumView();
    }

    const currencies = localConfig.targetCurrencies.slice(0, 6);
    const numericAmount = parseFloat(amount) || 0;

    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full p-2">
        {currencies.map(currency => {
          const rate = rates[currency] || 0;
          const value = (numericAmount * rate).toFixed(2);
          return (
            <div key={currency} className="flex flex-col items-center justify-center bg-card text-card-foreground rounded-md p-3 border shadow-sm">
              <span className="text-2xl font-semibold">
                {CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol}
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Tall Medium View (3x4)
  const renderTallMediumView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return renderMediumView();
    }

    const currencies = localConfig.targetCurrencies.slice(0, 6);
    const numericAmount = parseFloat(amount) || 0;

    return (
      <div className="grid grid-cols-2 grid-rows-3 gap-2 h-full p-2">
        {currencies.map(currency => {
          const rate = rates[currency] || 0;
          const value = (numericAmount * rate).toFixed(2);
          return (
            <div key={currency} className="flex flex-col items-center justify-center bg-card text-card-foreground rounded-md p-3 border shadow-sm">
              <span className="text-2xl font-semibold">
                {CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol}
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Large View (4x4)
  const renderLargeView = () => {
    if (!rates || !localConfig.targetCurrencies || localConfig.targetCurrencies.length === 0) {
      return renderMediumView();
    }

    const currencies = localConfig.targetCurrencies.slice(0, 8);
    const numericAmount = parseFloat(amount) || 0;

    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-3 h-full p-3">
        {/* Input section */}
        <div className="col-span-3 flex border rounded-md overflow-hidden">
          <Input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label={`Amount in ${localConfig.baseCurrency}`}
          />
          <div className="flex items-center px-3 text-sm text-muted-foreground bg-muted">
            {localConfig.baseCurrency}
          </div>
        </div>

        {/* Currency cards */}
        {currencies.map(currency => {
          const rate = rates[currency] || 0;
          const value = (numericAmount * rate).toFixed(2);
          return (
            <div key={currency} className="flex flex-col items-center justify-center bg-card text-card-foreground rounded-md p-3 border shadow-sm">
              <span className="text-2xl font-semibold">
                {CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol}
                {value}
              </span>
              <span className="text-xs text-muted-foreground">{currency}</span>
              <span className="text-xs text-muted-foreground mt-1">1 {localConfig.baseCurrency} = {rate.toFixed(4)} {currency}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Main render
  return (
    <div className="widget-container h-full flex flex-col">
      <WidgetHeader 
        title={localConfig.title || 'Currency Converter'} 
        onSettingsClick={() => setShowSettings(true)}
      />
      
      <div className="flex-grow overflow-hidden">
        {error && (error.includes('API key is required') || error.includes('Invalid API key')) ? (
          // Specific view for API key error
          <div className="h-full flex flex-col items-center justify-center text-center">
            {/* Use DollarSign icon from Lucide with consistent styling (gray color) */}
            <BadgeCent size={24} className="text-gray-400 mb-3" strokeWidth={1.5} />
            {/* Consistent text styling */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {error.includes('Invalid') ? 'Invalid API key.' : 'API key required for exchange rates.'}
            </p>
            {/* Consistent button styling */}
            <Button
              size="sm"
              onClick={() => setShowSettings(true)}
              variant="outline"
            >
              Configure API Key
            </Button>
          </div>
        ) : error ? (
          // General error view
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            {/* Use AlertCircle icon for errors */}
            <AlertCircle size={40} className="text-red-500 mb-3" strokeWidth={1.5} />
            {/* Consistent error text styling */}
            <p className="text-sm text-red-500 dark:text-red-400 mb-3">
              {error}
            </p>
            {/* Consistent button styling */}
            <Button
              size="sm"
              onClick={refetch} // Use refetch from the hook
            >
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Settings dialog */}
      {renderSettings()}
    </div>
  );
};

export default CurrencyConverterWidget; 