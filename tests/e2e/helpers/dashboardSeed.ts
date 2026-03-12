import type { Page } from '@playwright/test';

type SeedWidget = {
  id: string;
  type: string;
  config?: Record<string, unknown>;
};

type SeedLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
};

type SeedDashboardOptions = {
  widgets: SeedWidget[];
  layouts: Record<string, SeedLayoutItem[]>;
  dashboards?: Array<Record<string, unknown>>;
};

const DEFAULT_DASHBOARDS = [
  {
    id: 'personal',
    name: 'Personal',
    visibility: 'private',
    sharedWith: [],
    isDefault: true,
    createdAt: '2026-03-12T00:00:00.000Z',
  },
];

export async function seedDashboard(page: Page, options: SeedDashboardOptions): Promise<void> {
  await page.goto('/');
  await page.evaluate((seed) => {
    localStorage.clear();
    localStorage.setItem('theme', 'light');
    localStorage.setItem('boxento-dashboards', JSON.stringify(seed.dashboards));
    localStorage.setItem('boxento-current-dashboard', 'personal');
    localStorage.setItem('boxento-widgets-personal', JSON.stringify(seed.widgets));
    localStorage.setItem('boxento-layouts-personal', JSON.stringify(seed.layouts));
    localStorage.setItem('boxento-widgets', JSON.stringify(seed.widgets));
    localStorage.setItem('boxento-layouts', JSON.stringify(seed.layouts));
  }, {
    ...options,
    dashboards: options.dashboards ?? DEFAULT_DASHBOARDS,
  });
  await page.reload();
}
