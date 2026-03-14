import { describe, expect, it } from 'vitest';

import {
  areDashboardWidgetFramePropsEqual,
  type DashboardWidgetFrameComparisonProps,
} from '@/components/dashboard/dashboardWidgetFrameComparator';
import { Widget } from '@/types';

const createWidget = (id: string): Widget => ({
  id,
  type: 'quick-links',
  config: { customTitle: id },
});

const createProps = (overrides: Partial<DashboardWidgetFrameComparisonProps> = {}) => ({
  widget: createWidget('widget-1'),
  width: 3,
  height: 3,
  isReadOnly: false,
  ...overrides,
});

describe('DashboardWidgetFrame memo comparator', () => {
  it('reuses the widget frame when only callback identities change', () => {
    const previousProps = createProps();
    const nextProps = createProps({
      widget: previousProps.widget,
    });

    expect(areDashboardWidgetFramePropsEqual(previousProps, nextProps)).toBe(true);
  });

  it('rerenders when widget dimensions change', () => {
    const previousProps = createProps();
    const nextProps = createProps({
      widget: previousProps.widget,
      width: 4,
    });

    expect(areDashboardWidgetFramePropsEqual(previousProps, nextProps)).toBe(false);
  });

  it('rerenders when the widget instance changes', () => {
    const previousProps = createProps();
    const nextProps = createProps({
      widget: createWidget('widget-2'),
    });

    expect(areDashboardWidgetFramePropsEqual(previousProps, nextProps)).toBe(false);
  });
});
