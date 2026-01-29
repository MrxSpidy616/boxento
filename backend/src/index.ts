import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDatabase, closeDatabase } from './db/connection.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Initialize database on startup
const db = getDatabase();

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ Dashboard Routes ============

// Get all dashboards
app.get('/api/dashboards', (c) => {
  const dashboards = db.prepare(`
    SELECT id, name, visibility, shared_with, is_default, created_at, updated_at
    FROM dashboards
    ORDER BY is_default DESC, created_at ASC
  `).all();

  return c.json(dashboards.map((d: any) => ({
    ...d,
    sharedWith: d.shared_with ? JSON.parse(d.shared_with) : [],
    isDefault: Boolean(d.is_default),
  })));
});

// Get single dashboard
app.get('/api/dashboards/:id', (c) => {
  const { id } = c.req.param();
  const dashboard = db.prepare(`
    SELECT id, name, visibility, shared_with, is_default, created_at, updated_at
    FROM dashboards WHERE id = ?
  `).get(id) as any;

  if (!dashboard) {
    return c.json({ error: 'Dashboard not found' }, 404);
  }

  return c.json({
    ...dashboard,
    sharedWith: dashboard.shared_with ? JSON.parse(dashboard.shared_with) : [],
    isDefault: Boolean(dashboard.is_default),
  });
});

// Create dashboard
app.post('/api/dashboards', async (c) => {
  const body = await c.req.json();
  const { id, name, visibility = 'private', sharedWith = [] } = body;

  if (!id || !name) {
    return c.json({ error: 'id and name are required' }, 400);
  }

  try {
    db.prepare(`
      INSERT INTO dashboards (id, name, visibility, shared_with)
      VALUES (?, ?, ?, ?)
    `).run(id, name, visibility, JSON.stringify(sharedWith));

    return c.json({ id, name, visibility, sharedWith });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return c.json({ error: 'Dashboard already exists' }, 409);
    }
    throw err;
  }
});

// Update dashboard
app.put('/api/dashboards/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, visibility, sharedWith } = body;

  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (visibility !== undefined) {
    updates.push('visibility = ?');
    params.push(visibility);
  }
  if (sharedWith !== undefined) {
    updates.push('shared_with = ?');
    params.push(JSON.stringify(sharedWith));
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const result = db.prepare(`
    UPDATE dashboards SET ${updates.join(', ')} WHERE id = ?
  `).run(...params);

  if (result.changes === 0) {
    return c.json({ error: 'Dashboard not found' }, 404);
  }

  return c.json({ success: true });
});

// Delete dashboard
app.delete('/api/dashboards/:id', (c) => {
  const { id } = c.req.param();

  // Don't allow deleting the default dashboard
  const dashboard = db.prepare('SELECT is_default FROM dashboards WHERE id = ?').get(id) as any;
  if (dashboard?.is_default) {
    return c.json({ error: 'Cannot delete default dashboard' }, 400);
  }

  const result = db.prepare('DELETE FROM dashboards WHERE id = ?').run(id);

  if (result.changes === 0) {
    return c.json({ error: 'Dashboard not found' }, 404);
  }

  return c.json({ success: true });
});

// ============ Layout Routes ============

// Get all layouts for a dashboard
app.get('/api/dashboards/:id/layouts', (c) => {
  const { id } = c.req.param();

  const layouts = db.prepare(`
    SELECT breakpoint, layout_data FROM layouts WHERE dashboard_id = ?
  `).all(id) as any[];

  const result: Record<string, any[]> = {};
  for (const layout of layouts) {
    result[layout.breakpoint] = JSON.parse(layout.layout_data);
  }

  return c.json(result);
});

// Save all layouts for a dashboard
app.put('/api/dashboards/:id/layouts', async (c) => {
  const { id } = c.req.param();
  const layouts = await c.req.json();

  // Ensure dashboard exists
  const dashboard = db.prepare('SELECT id FROM dashboards WHERE id = ?').get(id);
  if (!dashboard) {
    // Auto-create dashboard if it doesn't exist
    db.prepare(`
      INSERT INTO dashboards (id, name, visibility)
      VALUES (?, ?, ?)
    `).run(id, id, 'private');
  }

  const upsert = db.prepare(`
    INSERT INTO layouts (dashboard_id, breakpoint, layout_data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(dashboard_id, breakpoint) DO UPDATE SET
      layout_data = excluded.layout_data,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const [breakpoint, layoutData] of Object.entries(layouts)) {
      upsert.run(id, breakpoint, JSON.stringify(layoutData));
    }
  });

  transaction();

  return c.json({ success: true });
});

// ============ Widget Routes ============

// Get widgets for a dashboard
app.get('/api/dashboards/:id/widgets', (c) => {
  const { id } = c.req.param();

  const widgets = db.prepare(`
    SELECT id, type, sort_order FROM widgets
    WHERE dashboard_id = ?
    ORDER BY sort_order ASC
  `).all(id) as any[];

  return c.json(widgets.map(w => ({ id: w.id, type: w.type })));
});

// Save widgets for a dashboard (replace all)
app.put('/api/dashboards/:id/widgets', async (c) => {
  const { id } = c.req.param();
  const widgets = await c.req.json();

  // Ensure dashboard exists
  const dashboard = db.prepare('SELECT id FROM dashboards WHERE id = ?').get(id);
  if (!dashboard) {
    db.prepare(`
      INSERT INTO dashboards (id, name, visibility)
      VALUES (?, ?, ?)
    `).run(id, id, 'private');
  }

  const transaction = db.transaction(() => {
    // Delete existing widgets for this dashboard
    db.prepare('DELETE FROM widgets WHERE dashboard_id = ?').run(id);

    // Insert new widgets
    const insert = db.prepare(`
      INSERT INTO widgets (id, dashboard_id, type, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    widgets.forEach((widget: any, index: number) => {
      insert.run(widget.id, id, widget.type, index);
    });
  });

  transaction();

  return c.json({ success: true });
});

// ============ Widget Config Routes ============

// Get all configs
app.get('/api/configs', (c) => {
  const configs = db.prepare(`
    SELECT widget_id, config_data FROM widget_configs
  `).all() as any[];

  const result: Record<string, any> = {};
  for (const config of configs) {
    result[config.widget_id] = JSON.parse(config.config_data);
  }

  return c.json(result);
});

// Get single config
app.get('/api/configs/:widgetId', (c) => {
  const { widgetId } = c.req.param();

  const config = db.prepare(`
    SELECT config_data FROM widget_configs WHERE widget_id = ?
  `).get(widgetId) as any;

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.json(JSON.parse(config.config_data));
});

// Save config
app.put('/api/configs/:widgetId', async (c) => {
  const { widgetId } = c.req.param();
  const configData = await c.req.json();

  // Upsert config - no foreign key constraint, configs can exist independently
  db.prepare(`
    INSERT INTO widget_configs (widget_id, config_data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(widget_id) DO UPDATE SET
      config_data = excluded.config_data,
      updated_at = CURRENT_TIMESTAMP
  `).run(widgetId, JSON.stringify(configData));

  return c.json({ success: true });
});

// Delete config
app.delete('/api/configs/:widgetId', (c) => {
  const { widgetId } = c.req.param();

  const result = db.prepare('DELETE FROM widget_configs WHERE widget_id = ?').run(widgetId);

  if (result.changes === 0) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.json({ success: true });
});

// ============ App Settings Routes ============

// Get settings
app.get('/api/settings', (c) => {
  const settings = db.prepare(`
    SELECT settings_data FROM app_settings WHERE id = 'default'
  `).get() as any;

  if (!settings) {
    return c.json({});
  }

  return c.json(JSON.parse(settings.settings_data));
});

// Save settings
app.put('/api/settings', async (c) => {
  const settingsData = await c.req.json();

  db.prepare(`
    INSERT INTO app_settings (id, settings_data, updated_at)
    VALUES ('default', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      settings_data = excluded.settings_data,
      updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(settingsData));

  return c.json({ success: true });
});

// ============ Server Startup ============

import { serve } from '@hono/node-server';

const PORT = parseInt(process.env.PORT || '3001', 10);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  closeDatabase();
  process.exit(0);
});

console.log(`Starting Boxento Backend on port ${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: '0.0.0.0',  // Listen on all interfaces for Tailscale access
}, (info) => {
  console.log(`Server running at http://0.0.0.0:${info.port}`);
});
