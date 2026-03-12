import { describe, expect, it } from 'vitest';

import {
  applyWidgetLayoutConstraints,
  getBreakpointForWidth,
  rebalanceWideSparseLayout,
  scaleLayoutToCols,
  validateLayouts,
} from '@/lib/dashboardLayouts';
import { LayoutItem, Widget } from '@/types';

const createWidget = (type: string, id = type): Widget => ({
  id,
  type,
  config: {},
});

const createLayoutItem = (
  overrides: Partial<LayoutItem> & Pick<LayoutItem, 'i' | 'x' | 'y' | 'w' | 'h'>
): LayoutItem => ({
  minW: 2,
  minH: 2,
  ...overrides,
});

describe('dashboardLayouts', () => {
  it('maps viewport widths to the expected breakpoints', () => {
    expect(getBreakpointForWidth(2560)).toBe('xxxl');
    expect(getBreakpointForWidth(2559)).toBe('xxl');
    expect(getBreakpointForWidth(1536)).toBe('xl');
    expect(getBreakpointForWidth(1512)).toBe('lg');
    expect(getBreakpointForWidth(480)).toBe('xs');
  });

  it('applies widget-specific desktop and mobile size constraints', () => {
    const quickLinks = applyWidgetLayoutConstraints(
      createLayoutItem({ i: 'quick-links-1', x: 0, y: 0, w: 1, h: 1 }),
      createWidget('quick-links', 'quick-links-1'),
      'xl'
    );
    expect(quickLinks.minW).toBe(1);
    expect(quickLinks.minH).toBe(1);

    const weather = applyWidgetLayoutConstraints(
      createLayoutItem({ i: 'weather-1', x: 0, y: 0, w: 1, h: 1 }),
      createWidget('weather', 'weather-1'),
      'xl'
    );
    expect(weather.minW).toBe(2);
    expect(weather.minH).toBe(2);

    const mobileQuickLinks = applyWidgetLayoutConstraints(
      createLayoutItem({ i: 'quick-links-1', x: 1, y: 0, w: 5, h: 1 }),
      createWidget('quick-links', 'quick-links-1'),
      'xs'
    );
    expect(mobileQuickLinks.minW).toBe(2);
    expect(mobileQuickLinks.minH).toBe(2);
    expect(mobileQuickLinks.maxW).toBe(2);
    expect(mobileQuickLinks.maxH).toBe(2);
    expect(mobileQuickLinks.x).toBe(0);
  });

  it('scales saved layouts to wider breakpoints without overlapping items', () => {
    const scaled = scaleLayoutToCols([
      createLayoutItem({ i: 'a', x: 0, y: 0, w: 3, h: 3 }),
      createLayoutItem({ i: 'b', x: 3, y: 0, w: 2, h: 3 }),
      createLayoutItem({ i: 'c', x: 5, y: 0, w: 3, h: 3 }),
      createLayoutItem({ i: 'd', x: 8, y: 0, w: 3, h: 3 }),
    ], 12, 18);

    expect(scaled.map((item) => [item.i, item.x, item.w])).toEqual([
      ['a', 0, 5],
      ['b', 5, 3],
      ['c', 8, 4],
      ['d', 12, 5],
    ]);

    for (let index = 1; index < scaled.length; index += 1) {
      const previous = scaled[index - 1];
      const current = scaled[index];
      expect(current.x).toBeGreaterThanOrEqual(previous.x + previous.w);
    }
  });

  it('rebalances sparse single-row wide layouts into evenly filled rows', () => {
    const rebalanced = rebalanceWideSparseLayout([
      createLayoutItem({ i: 'left', x: 0, y: 0, w: 3, h: 3 }),
      createLayoutItem({ i: 'right', x: 18, y: 0, w: 3, h: 3 }),
    ], 24);

    expect(rebalanced).not.toBeNull();
    expect(rebalanced?.map((item) => [item.i, item.x, item.w])).toEqual([
      ['left', 0, 12],
      ['right', 12, 12],
    ]);
  });

  it('scales and rebalances matching wide layouts during validation', () => {
    const lgLayout = [
      createLayoutItem({ i: 'left', x: 0, y: 0, w: 3, h: 3 }),
      createLayoutItem({ i: 'right', x: 9, y: 0, w: 3, h: 3 }),
    ];

    const validated = validateLayouts({
      lg: lgLayout,
      xxxl: lgLayout.map((item) => ({ ...item })),
    }, { rebalanceWideSparse: true });

    expect(validated.xxxl.map((item) => [item.i, item.x, item.w])).toEqual([
      ['left', 0, 12],
      ['right', 12, 12],
    ]);
  });
});
