import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import YearProgressWidget from '@/components/widgets/YearProgressWidget';

const renderTinyWidget = (config: { showPercentage?: boolean; showDaysLeft?: boolean }) =>
  renderToStaticMarkup(
    React.createElement(YearProgressWidget, {
      width: 1,
      height: 1,
      config,
    })
  );

describe('YearProgressWidget tiny summary', () => {
  it('respects stat visibility toggles', () => {
    const daysOnlyMarkup = renderTinyWidget({ showPercentage: false, showDaysLeft: true });
    expect(daysOnlyMarkup).not.toContain('%');
    expect(daysOnlyMarkup).toContain('days left');

    const percentageOnlyMarkup = renderTinyWidget({ showPercentage: true, showDaysLeft: false });
    expect(percentageOnlyMarkup).toContain('%');
    expect(percentageOnlyMarkup).toContain('complete');
    expect(percentageOnlyMarkup).not.toContain('days left');
  });
});
