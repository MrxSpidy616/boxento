import { Widget } from '@/types';

export type DashboardWidgetFrameComparisonProps = {
  widget: Widget;
  width: number;
  height: number;
  isReadOnly: boolean;
};

export const areDashboardWidgetFramePropsEqual = (
  previousProps: DashboardWidgetFrameComparisonProps,
  nextProps: DashboardWidgetFrameComparisonProps
) => (
  previousProps.widget === nextProps.widget
  && previousProps.width === nextProps.width
  && previousProps.height === nextProps.height
  && previousProps.isReadOnly === nextProps.isReadOnly
);
