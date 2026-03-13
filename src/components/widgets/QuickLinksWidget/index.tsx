import React, { useState, useRef, useMemo } from 'react'
import { ExternalLink, Plus, Trash, Edit, Search, Globe, X, Pencil, Trash2, FolderOpen } from 'lucide-react'
import WidgetHeader from '../../widgets/common/WidgetHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog'
import { Input } from '@/components/ui/input'
import { QuickLinksWidgetProps, LinkItem } from './types'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

/**
 * Fetches metadata from a URL including title and favicon
 * @param url The URL to fetch metadata from
 * @returns Promise with title and favicon extracted from favicon
 */
const fetchUrlMetadata = async (url: string): Promise<{ title: string; favicon: string }> => {
  try {
    // Validate and normalize the URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);

    // Special handling for localhost URLs
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return {
        title: 'Localhost',
        favicon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcng9IjIuMTgiIHJ5PSIyLjE4Ii8+PHJlY3QgeD0iNyIgeT0iNyIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PC9zdmc+'
      };
    }

    // Use DuckDuckGo's favicon service for non-localhost URLs
    const favicon = `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`;

    // Extract a reasonable title from the URL if metadata fetching fails
    let extractedTitle = "";
    
    // Try to get a reasonable title from the URL path
    if (urlObj.pathname && urlObj.pathname !== "/") {
      const path = urlObj.pathname.endsWith('/') 
        ? urlObj.pathname.slice(0, -1) 
        : urlObj.pathname;
      
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        extractedTitle = segments[segments.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // If path doesn't provide a good title, use the hostname without TLD
    if (!extractedTitle) {
      const hostnameWithoutWWW = urlObj.hostname.replace(/^www\./, '');
      const mainDomain = hostnameWithoutWWW.split('.')[0];
      
      extractedTitle = mainDomain
        .charAt(0).toUpperCase() + mainDomain.slice(1)
        .replace(/-/g, ' ');
    }

    // Skip the JSONLink API call since it's causing CORS issues
    // Return our fallback data immediately
    return { 
      title: extractedTitle || urlObj.hostname,
      favicon
    };

  } catch (error) {
    console.error('Error in fetchUrlMetadata:', error);
    // Return a basic fallback using the URL's hostname
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return {
        title: urlObj.hostname,
        favicon: `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`
      };
    } catch {
      // Final fallback if URL parsing also fails
      return {
        title: url,
        favicon: `https://icons.duckduckgo.com/ip3/example.com.ico`
      };
    }
  }
};

/**
 * QuickLinks Widget Component
 * 
 * A widget that displays a collection of customizable links for quick access.
 * Supports different layouts based on widget dimensions (minimum size 2x2) and provides a settings
 * interface for adding, editing, and removing links.
 * 
 * @component
 * @param {QuickLinksWidgetProps} props - Component props
 * @returns {JSX.Element} QuickLinks widget component
 */
const QuickLinksWidget: React.FC<QuickLinksWidgetProps> = ({ width, height, config }) => {
  const isTiny = width === 1 && height === 1;
  const isApp = width >= 6 && height >= 6;
  const readOnly = config?.readOnly ?? false;
  const [links, setLinks] = useState<LinkItem[]>(config?.links || []);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState<string>('');
  const [isLoading] = useState<boolean>(false);
  const newLinkInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingLinkIds, setLoadingLinkIds] = useState<number[]>([]);

  // App-mode state
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const [appEditingLink, setAppEditingLink] = useState<LinkItem | null>(null);
  const [showAppAddForm, setShowAppAddForm] = useState(false);

  // Widget settings state
  const [displayMode, setDisplayMode] = useState<'regular' | 'compact'>(config?.displayMode || 'regular');
  const [showFavicons, setShowFavicons] = useState<boolean>(config?.showFavicons !== false);
  const [customTitle, setCustomTitle] = useState<string>(config?.customTitle || 'Quick Links');

  // Remove the separate useEffects and combine them into one
  React.useEffect(() => {
    // Only update if we have config and it's different from current state
    if (config) {
      const shouldUpdateLinks = config.links && JSON.stringify(config.links) !== JSON.stringify(links);
      if (shouldUpdateLinks) {
        setLinks(config.links);
      }
      
      // Update other settings only if they've changed
      if (config.displayMode && config.displayMode !== displayMode) {
        setDisplayMode(config.displayMode);
      }
      if (config.customTitle && config.customTitle !== customTitle) {
        setCustomTitle(config.customTitle);
      }
      if (config.showFavicons !== undefined && config.showFavicons !== showFavicons) {
        setShowFavicons(config.showFavicons);
      }
    }
  }, [config]); // Depend on entire config object

  /**
   * Adds or updates a link in the links collection
   * 
   * If the editingLink has an id, it updates the existing link.
   * Otherwise, it creates a new link with a unique id.
   */
  const addLink = () => {
    if (editingLink && editingLink.title && editingLink.url) {
      let updatedLinks: LinkItem[];

      if (editingLink.id) {
        // Update existing link
        updatedLinks = links.map(link => 
          link.id === editingLink.id ? editingLink : link
        );
      } else {
        // Add new link
        const newId = Math.max(0, ...links.map(link => link.id)) + 1;
        updatedLinks = [...links, { ...editingLink, id: newId }];
      }

      // Update state
      setLinks(updatedLinks);
      
      // Separate the onUpdate to avoid React warnings about updates during render
      // Use setTimeout to ensure it runs after the current render cycle
      if (config && config.onUpdate) {
        const updateFunction = config.onUpdate;
        const configCopy = { ...config };
        
        setTimeout(() => {
          // Create a clean copy of the data to avoid undefined values
          const linksCopy = JSON.parse(JSON.stringify(updatedLinks));
          updateFunction({
            ...configCopy,
            links: linksCopy
          });
        }, 0);
      }
      
      setEditingLink(null);
    }
  }

  /**
   * Removes a link from the links collection
   * 
   * @param {number} id - The id of the link to remove
   */
  const removeLink = (id: number) => {
    const updatedLinks = links.filter(link => link.id !== id);
    
    // Update state
    setLinks(updatedLinks);
    
    // Save using onUpdate callback to persist
    if (config?.onUpdate) {
      config.onUpdate({
        ...config,
        links: updatedLinks
      });
    }
  }

  /**
   * Starts editing a link or creates a new one
   * 
   * @param {LinkItem | null} link - The link to edit, or null to create a new one
   */
  const startEdit = (link: LinkItem | null = null) => {
    setEditingLink(link || { id: 0, title: '', url: '', favicon: '' })
  }

  /**
   * Updates widget settings and saves them
   */
  const saveSettings = () => {
    if (config && config.onUpdate) {
      const updateFunction = config.onUpdate;
      const configCopy = { ...config };
      
      // Use setTimeout to ensure it runs after the current render cycle
      setTimeout(() => {
        // Create a clean copy of the data to avoid undefined values
        const linksCopy = JSON.parse(JSON.stringify(links));
        updateFunction({
          ...configCopy,
          links: linksCopy,
          displayMode,
          showFavicons,
          customTitle
        });
      }, 0);
    }
    setShowSettings(false);
  }

  // Modify handleQuickAdd to handle updates more carefully
  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rawUrl = newLinkUrl.trim();
    if (!rawUrl) return;

    try {
      // Validate and normalize the URL
      let normalizedUrl = rawUrl;
      if (!rawUrl.match(/^https?:\/\//)) {
        normalizedUrl = `https://${rawUrl}`;
      }

      const urlObj = new URL(normalizedUrl);
      
      // Generate new ID using current links state
      const newId = Math.max(0, ...links.map(link => link.id), 0) + 1;
      
      // Create new link
      const newLink: LinkItem = {
        id: newId,
        url: normalizedUrl,
        title: urlObj.hostname,
        favicon: `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`
      };

      // Create updated links array
      const updatedLinks = [...links, newLink];

      // Update local state first
      setLinks(updatedLinks);
      setNewLinkUrl('');
      setLoadingLinkIds(prev => [...prev, newId]);

      // Update config with new links
      if (config?.onUpdate) {
        const configUpdate = {
          ...config,
          links: updatedLinks // Use the updated links array
        };
        
        try {
          await config.onUpdate(configUpdate);
        } catch (error) {
          console.error('Error updating config:', error);
          // Rollback on error
          setLinks(links);
          return;
        }
      }

      // Fetch metadata after successful save
      try {
        const metadata = await fetchUrlMetadata(normalizedUrl);
        
        if (metadata.title !== newLink.title) {
          const finalLink = {
            ...newLink,
            title: metadata.title,
            favicon: metadata.favicon
          };

          // Update with metadata
          const finalUpdatedLinks = updatedLinks.map(link => 
            link.id === newId ? finalLink : link
          );

          setLinks(finalUpdatedLinks);

          // Update config with metadata
          if (config?.onUpdate) {
            const finalConfigUpdate = {
              ...config,
              links: finalUpdatedLinks
            };
            await config.onUpdate(finalConfigUpdate);
          }
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
        // Link is already saved with basic info, so we can continue
      } finally {
        setLoadingLinkIds(prev => prev.filter(id => id !== newId));
      }
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingLink) return;
    const currentLink = editingLink;
    const url = e.target.value;
    try {
      // Basic URL validation
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const favicon = `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`;
      setEditingLink({
        ...currentLink,
        url,
        favicon,
        title: currentLink.title || urlObj.hostname
      });
      
      if (url && url.match(/^https?:\/\/.+/)) {
        try {
          // Try to get enhanced metadata
          const metadata = await fetchUrlMetadata(url);
          setEditingLink(prev => prev ? ({
            ...prev,
            url,
            title: metadata.title,
            favicon
          }) : prev);
        } catch (error) {
          console.error('Error fetching URL metadata:', error);
          setEditingLink(prev => prev ? ({
            ...prev,
            url,
            favicon
          }) : prev);
        }
      }
    } catch (urlError) {
      console.warn('Invalid URL format:', urlError);
      setEditingLink({ ...currentLink, url });
    }
  };

  // ─── App-mode helpers ─────────────────────────────────────────────────
  const filteredLinks = useMemo(() => {
    if (!appSearchQuery.trim()) return links;
    const q = appSearchQuery.toLowerCase();
    return links.filter(
      l =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.category && l.category.toLowerCase().includes(q))
    );
  }, [links, appSearchQuery]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    links.forEach(l => { if (l.category) cats.add(l.category); });
    return Array.from(cats).sort();
  }, [links]);

  const selectedLink = useMemo(
    () => links.find(l => l.id === selectedLinkId) ?? null,
    [links, selectedLinkId]
  );

  const handleAppAddLink = async () => {
    if (!appEditingLink || !appEditingLink.url) return;
    const normalizedUrl = appEditingLink.url.startsWith('http')
      ? appEditingLink.url
      : `https://${appEditingLink.url}`;

    let title = appEditingLink.title;
    let favicon = appEditingLink.favicon;
    try {
      const urlObj = new URL(normalizedUrl);
      if (!favicon) favicon = `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`;
      if (!title) title = urlObj.hostname;
    } catch {
      if (!title) title = normalizedUrl;
      if (!favicon) favicon = '';
    }

    const newId = Math.max(0, ...links.map(l => l.id), 0) + 1;
    const newLink: LinkItem = {
      id: appEditingLink.id || newId,
      url: normalizedUrl,
      title,
      favicon,
      category: appEditingLink.category || undefined,
    };

    let updatedLinks: LinkItem[];
    if (appEditingLink.id) {
      updatedLinks = links.map(l => (l.id === appEditingLink.id ? newLink : l));
    } else {
      updatedLinks = [...links, newLink];
    }

    setLinks(updatedLinks);
    setAppEditingLink(null);
    setShowAppAddForm(false);
    setSelectedLinkId(newLink.id);

    // Persist
    if (config?.onUpdate) {
      config.onUpdate({ ...config, links: updatedLinks });
    }

    // Fetch metadata in background
    try {
      const metadata = await fetchUrlMetadata(normalizedUrl);
      if (metadata.title !== title) {
        const enriched = { ...newLink, title: metadata.title, favicon: metadata.favicon };
        const enrichedLinks = updatedLinks.map(l => (l.id === newLink.id ? enriched : l));
        setLinks(enrichedLinks);
        if (config?.onUpdate) {
          config.onUpdate({ ...config, links: enrichedLinks });
        }
      }
    } catch { /* best-effort */ }
  };

  // ─── App view (6x6+) ────────────────────────────────────────────────
  const renderAppView = () => {
    const rightPanelLink = appEditingLink ?? selectedLink;

    return (
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {customTitle}
          </h2>
          <div className="relative flex-grow max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={appSearchQuery}
              onChange={e => setAppSearchQuery(e.target.value)}
              placeholder="Search links..."
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
            {appSearchQuery && (
              <button
                onClick={() => setAppSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {filteredLinks.length} / {links.length} links
          </span>
          {!readOnly && (
            <button
              onClick={() => {
                setAppEditingLink({ id: 0, title: '', url: '', favicon: '', category: '' });
                setShowAppAddForm(true);
                setSelectedLinkId(null);
              }}
              className="ml-auto flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={14} />
              Add Link
            </button>
          )}
        </div>

        {/* Master-detail layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: link grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredLinks.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Globe size={32} className="mb-2 opacity-60" />
                <p className="text-sm">
                  {appSearchQuery ? 'No links match your search' : 'No links yet. Add your first bookmark!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredLinks.map(link => (
                  <div
                    key={link.id}
                    onClick={() => {
                      setSelectedLinkId(link.id);
                      setAppEditingLink(null);
                      setShowAppAddForm(false);
                    }}
                    className={`group relative flex cursor-pointer flex-col rounded-lg border p-3 transition-all hover:shadow-md ${
                      selectedLinkId === link.id
                        ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-500 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Hover actions */}
                    {!readOnly && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setAppEditingLink({ ...link });
                            setShowAppAddForm(false);
                            setSelectedLinkId(link.id);
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          aria-label={`Edit ${link.title}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeLink(link.id);
                            if (selectedLinkId === link.id) setSelectedLinkId(null);
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          aria-label={`Delete ${link.title}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5">
                      {showFavicons && link.favicon && (
                        <img
                          src={link.favicon}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded"
                          loading="lazy"
                        />
                      )}
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                        {link.title}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-xs text-gray-400 dark:text-gray-500">
                      {link.url}
                    </p>
                    {link.category && (
                      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <FolderOpen size={10} />
                        {link.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: detail / add form panel */}
          <div className="w-72 shrink-0 border-l border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30 overflow-y-auto">
            {showAppAddForm && appEditingLink && !appEditingLink.id ? (
              /* Add new link form */
              <div className="p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Add New Link
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">URL</label>
                    <input
                      type="url"
                      value={appEditingLink.url}
                      onChange={e => setAppEditingLink({ ...appEditingLink, url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
                    <input
                      type="text"
                      value={appEditingLink.title}
                      onChange={e => setAppEditingLink({ ...appEditingLink, title: e.target.value })}
                      placeholder="Auto-detected from URL"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                    <input
                      type="text"
                      value={appEditingLink.category || ''}
                      onChange={e => setAppEditingLink({ ...appEditingLink, category: e.target.value })}
                      placeholder="e.g. Work, Social, News"
                      list="app-link-categories"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                    {categories.length > 0 && (
                      <datalist id="app-link-categories">
                        {categories.map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowAppAddForm(false);
                        setAppEditingLink(null);
                      }}
                      className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAppAddLink}
                      disabled={!appEditingLink.url.trim()}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add Link
                    </button>
                  </div>
                </div>
              </div>
            ) : appEditingLink && appEditingLink.id ? (
              /* Edit existing link form */
              <div className="p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Edit Link
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">URL</label>
                    <input
                      type="url"
                      value={appEditingLink.url}
                      onChange={e => setAppEditingLink({ ...appEditingLink, url: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
                    <input
                      type="text"
                      value={appEditingLink.title}
                      onChange={e => setAppEditingLink({ ...appEditingLink, title: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                    <input
                      type="text"
                      value={appEditingLink.category || ''}
                      onChange={e => setAppEditingLink({ ...appEditingLink, category: e.target.value })}
                      placeholder="e.g. Work, Social, News"
                      list="app-link-categories-edit"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                    {categories.length > 0 && (
                      <datalist id="app-link-categories-edit">
                        {categories.map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setAppEditingLink(null);
                      }}
                      className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAppAddLink}
                      disabled={!appEditingLink.url.trim()}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : rightPanelLink ? (
              /* Preview selected link */
              <div className="p-4">
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Link Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {showFavicons && rightPanelLink.favicon && (
                      <img
                        src={rightPanelLink.favicon}
                        alt=""
                        className="h-8 w-8 rounded"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                        {rightPanelLink.title}
                      </p>
                      {rightPanelLink.category && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <FolderOpen size={10} />
                          {rightPanelLink.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">URL</label>
                    <a
                      href={rightPanelLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {rightPanelLink.url}
                    </a>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={rightPanelLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <ExternalLink size={12} />
                      Open
                    </a>
                    {!readOnly && (
                      <button
                        onClick={() => {
                          setAppEditingLink({ ...rightPanelLink });
                          setShowAppAddForm(false);
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center p-4 text-center text-gray-400 dark:text-gray-500">
                <Globe size={24} className="mb-2 opacity-50" />
                <p className="text-xs">Select a link to preview details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders the main content of the widget
   */
  const renderContent = () => {
    const isShort = height === 1 && width > 1;
    const isCompactLayout = displayMode === 'compact' || width <= 2 || height <= 2;
    const previewLinks = links.slice(0, Math.min(links.length, Math.max(2, width + 1)));
    const firstLink = links[0];

    // App mode takes priority after tiny/short detection
    if (isApp) return renderAppView();

    if (links.length === 0) {
      if (isTiny) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <div className="text-lg font-semibold leading-none text-gray-900 dark:text-gray-100">0</div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">links</div>
          </div>
        );
      }

      return (
        <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
          <p className="text-xs">No links yet</p>
          {!isTiny && (
            <button
              onClick={() => startEdit(null)}
              className="mt-2 text-xs text-blue-500 hover:underline"
            >
              Add link
            </button>
          )}
        </div>
      );
    }

    if (isTiny && firstLink) {
      return (
        <a
          href={firstLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full flex-col items-center justify-center gap-1 text-center text-gray-800 dark:text-gray-100"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="text-lg font-semibold leading-none">{links.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">links</div>
        </a>
      );
    }

    if (isShort) {
      return (
        <div className="flex h-full items-center gap-2 overflow-x-auto px-1 text-xs">
          <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-1 font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
            {links.length} links
          </span>
          {previewLinks.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex shrink-0 items-center gap-2 rounded-full border border-black/5 bg-white/80 px-2.5 py-1.5 text-gray-700 ring-1 ring-black/5 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-black/20 dark:text-gray-200 dark:ring-white/10 ${
                loadingLinkIds.includes(link.id) ? 'opacity-50' : ''
              }`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {showFavicons && (
                <img src={link.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" loading="lazy" />
              )}
              <span className="max-w-[8rem] truncate">{loadingLinkIds.includes(link.id) ? 'Loading...' : link.title}</span>
            </a>
          ))}
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex-grow overflow-y-auto">
          {isCompactLayout ? (
            // Compact view - slim single-column layout with smaller elements
            <div className="space-y-1 pr-1">
              {links.map(link => (
                <a 
                  key={link.id}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center p-1 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 dark:hover:bg-opacity-50 transition-all relative text-gray-800 dark:text-gray-100 group ${
                    loadingLinkIds.includes(link.id) ? 'opacity-50' : ''
                  }`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  aria-label={`Visit ${link.title} at ${link.url}`}
                >
                  {showFavicons && (
                    <img 
                      src={link.favicon}
                      alt=""
                      className={`w-3 h-3 mr-1.5 ${
                        loadingLinkIds.includes(link.id) ? 'animate-pulse' : ''
                      }`}
                      loading="lazy"
                    />
                  )}
                  <span className="text-xs font-medium flex-grow truncate">
                    {loadingLinkIds.includes(link.id) ? 'Loading...' : link.title}
                  </span>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button 
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEdit(link);
                      }}
                      className="p-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      aria-label={`Edit ${link.title} link`}
                      disabled={loadingLinkIds.includes(link.id)}
                    >
                      <Edit size={10} />
                    </button>
                    <button 
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeLink(link.id);
                      }}
                      className="p-0.5 text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                      aria-label={`Remove ${link.title} link`}
                      disabled={loadingLinkIds.includes(link.id)}
                    >
                      <Trash size={10} />
                    </button>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            // Regular view - standard list with normal spacing
            <div className="space-y-2 pr-1">
              {links.map(link => (
                <a 
                  key={link.id}
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:hover:bg-opacity-50 transition-all relative text-gray-800 dark:text-gray-100 group ${
                    loadingLinkIds.includes(link.id) ? 'opacity-50' : ''
                  }`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  aria-label={`Visit ${link.title} at ${link.url}`}
                >
                  {showFavicons && (
                    <img 
                      src={link.favicon}
                      alt=""
                      className={`w-4 h-4 mr-2.5 ${
                        loadingLinkIds.includes(link.id) ? 'animate-pulse' : ''
                      }`}
                      loading="lazy"
                    />
                  )}
                  <span className="font-medium flex-grow truncate">
                    {loadingLinkIds.includes(link.id) ? 'Loading...' : link.title}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEdit(link);
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      aria-label={`Edit ${link.title} link`}
                      disabled={loadingLinkIds.includes(link.id)}
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeLink(link.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                      aria-label={`Remove ${link.title} link`}
                      disabled={loadingLinkIds.includes(link.id)}
                    >
                      <Trash size={14} />
                    </button>
                    <ExternalLink size={14} className="text-gray-400" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Integrated add link form - hidden on small sizes */}
        {isCompactLayout ? (
          <button
            onClick={() => startEdit(null)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Link
          </button>
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <form
              onSubmit={handleQuickAdd}
              className="flex items-center gap-2"
            >
              <Input
                ref={newLinkInputRef}
                type="url"
                value={newLinkUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLinkUrl(e.target.value)}
                placeholder="Paste a URL and press Enter..."
                className="flex-grow"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                disabled={!newLinkUrl.trim() || isLoading}
                aria-label="Add link"
              >
                <Plus size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`widget-container h-full flex flex-col ${isTiny ? 'widget-drag-handle' : ''}`}>
      {!isTiny && !isApp && (
        <WidgetHeader
          title={customTitle}
          onSettingsClick={readOnly ? undefined : () => setShowSettings(true)}
          compact={width === 1 || height === 1}
        />
      )}
      <div className={`flex-1 overflow-hidden ${isTiny ? 'p-2' : isApp ? '' : width === 1 || height === 1 ? 'p-1.5' : 'p-3'}`}>
        {renderContent()}
      </div>
      
      {/* Settings Dialog */}
      {showSettings && (
        <Dialog
          open={showSettings}
          onOpenChange={(open: boolean) => {
            if (!open) {
              // Reset to saved config on close without save
              if (config) {
                setDisplayMode(config.displayMode || 'regular');
                setShowFavicons(config.showFavicons !== false);
                setCustomTitle(config.customTitle || 'Quick Links');
              }
              setShowSettings(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Quick Links Settings</DialogTitle>
            </DialogHeader>

            <div className="max-h-[min(60vh,500px)] overflow-y-auto py-4">
              <div className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="widget-title">Title</Label>
                  <Input
                    id="widget-title"
                    value={customTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTitle(e.target.value)}
                    placeholder="Quick Links"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Display Mode</Label>
                  <RadioGroup value={displayMode} onValueChange={(val: string) => setDisplayMode(val as 'regular' | 'compact')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="regular" id="regular-view" />
                      <Label htmlFor="regular-view" className="flex items-center">
                        Regular View
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compact" id="compact-view" />
                      <Label htmlFor="compact-view" className="flex items-center">
                        Compact View
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Show Favicons</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showFavicons}
                      onCheckedChange={setShowFavicons}
                      id="show-favicons"
                    />
                    <Label htmlFor="show-favicons">Show website icons</Label>
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

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset to saved config on cancel
                      if (config) {
                        setDisplayMode(config.displayMode || 'regular');
                        setShowFavicons(config.showFavicons !== false);
                        setCustomTitle(config.customTitle || 'Quick Links');
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
      )}

      {/* Edit Link Dialog */}
      {editingLink && (
        <Dialog
          open={true}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingLink(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">

              <div className="space-y-2 mt-4">
                <Label htmlFor="url-input">URL</Label>
                <Input 
                  id="url-input"
                  type="url" 
                  value={editingLink.url} 
                  onChange={handleUrlChange}
                  placeholder="https://google.com"
                  className="w-full truncate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title-input">Display Title</Label>
                <Input 
                  id="title-input"
                  type="text" 
                  value={editingLink.title} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingLink({...editingLink, title: e.target.value})}
                  placeholder="Override auto-detected title"
                />
              </div>
            </div>
            <DialogFooter>
              <div className="flex justify-end">
                <Button
                  variant="default"
                  onClick={() => {
                    if (editingLink.url) {
                      addLink();
                      setEditingLink(null);
                    }
                  }}
                  disabled={!editingLink.url}
                >
                  {editingLink.id ? 'Update' : 'Add'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default QuickLinksWidget 
