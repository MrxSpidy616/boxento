import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import QRCodeWidget from '@/components/widgets/QRCodeWidget';

const renderCompactWidget = (config: Record<string, unknown>) =>
  renderToStaticMarkup(
    React.createElement(QRCodeWidget, {
      width: 2,
      height: 2,
      config,
    })
  );

describe('QRCodeWidget compact layout', () => {
  it('uses compact chrome for the default 2x2 setup state', () => {
    const html = renderCompactWidget({ title: 'QR Code' });

    expect(html).toContain('Configure this widget to get started');
    expect(html).toContain('p-1.5 md:p-2');
    expect(html).toContain('text-[11px]');
    expect(html).toContain('h-7');
  });

  it('renders a larger QR code for configured 2x2 widgets', () => {
    const html = renderCompactWidget({
      title: 'QR Code',
      content: 'https://example.com',
    });

    expect(html).toContain('height="108"');
    expect(html).toContain('width="108"');
    expect(html).not.toContain('height="80"');
  });
});
