import { LayoutItem } from '@/types';
import { BREAKPOINTS, COLS } from './constants';

// Re-export for backward compatibility
export const breakpoints = BREAKPOINTS;
export const cols = COLS;

/**
 * Create an occupancy grid from the existing layout
 */
const createOccupancyGrid = (
  existingLayout: LayoutItem[],
  colCount: number,
  extraRows: number
): boolean[][] => {
  // Find the max Y to know how far to scan
  let maxY = 0;
  existingLayout.forEach(item => {
    const itemBottom = item.y + item.h;
    if (itemBottom > maxY) maxY = itemBottom;
  });

  // Add extra rows for new widgets
  maxY += extraRows;

  // Create occupancy grid
  const grid: boolean[][] = [];
  for (let y = 0; y < maxY; y++) {
    grid[y] = new Array(colCount).fill(false);
  }

  // Mark occupied cells
  existingLayout.forEach(item => {
    for (let y = item.y; y < item.y + item.h; y++) {
      for (let x = item.x; x < item.x + item.w; x++) {
        if (grid[y] && x < colCount) {
          grid[y][x] = true;
        }
      }
    }
  });

  return grid;
};

/**
 * Check if a widget of given size can fit at position (x, y)
 */
const canFitAt = (
  grid: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number,
  colCount: number
): boolean => {
  // Check bounds
  if (x + width > colCount) return false;
  if (y + height > grid.length) return false;

  // Check all cells
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (grid[y + dy] && grid[y + dy][x + dx]) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Find the best available position and size for a new widget.
 * Prioritizes filling gaps at the top with appropriately-sized widgets.
 *
 * Strategy: Scan top-to-bottom, left-to-right. For each position,
 * find the largest size that fits (up to defaultSize). Return the
 * first position that can fit at least minSize.
 */
const findBestPositionAndSize = (
  existingLayout: LayoutItem[],
  colCount: number,
  minWidth: number,
  minHeight: number,
  defaultWidth: number,
  defaultHeight: number
): { x: number; y: number; w: number; h: number } => {
  const grid = createOccupancyGrid(existingLayout, colCount, defaultHeight);

  // Scan from top-left
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < colCount; x++) {
      // Skip if this cell is occupied
      if (grid[y] && grid[y][x]) continue;

      // Try sizes from largest to smallest, find the best that fits
      // We prefer larger sizes but will accept smaller ones to fill gaps
      for (let h = defaultHeight; h >= minHeight; h--) {
        for (let w = defaultWidth; w >= minWidth; w--) {
          if (canFitAt(grid, x, y, w, h, colCount)) {
            return { x, y, w, h };
          }
        }
      }
    }
  }

  // Fallback: place at bottom with default size
  const maxY = grid.length;
  return { x: 0, y: maxY, w: defaultWidth, h: defaultHeight };
};

export const createDefaultLayoutItem = (
  widgetId: string,
  _index: number,
  colCount: number,
  breakpoint: string,
  existingLayout: LayoutItem[] = []
): LayoutItem => {
  if (breakpoint === 'xxxl' || breakpoint === 'xxl' || breakpoint === 'xl' || breakpoint === 'lg' || breakpoint === 'md') {
    // Desktop: prefer 3x3, but can shrink to 2x2
    const { x, y, w, h } = findBestPositionAndSize(existingLayout, colCount, 2, 2, 3, 3);

    return {
      i: widgetId,
      x,
      y,
      w,
      h,
      minW: 2,
      minH: 2
    };
  } else if (breakpoint === 'sm') {
    // Small: prefer 3x3, but can shrink to 2x2
    const { x, y, w, h } = findBestPositionAndSize(existingLayout, colCount, 2, 2, 3, 3);

    return {
      i: widgetId,
      x,
      y,
      w,
      h,
      minW: 2,
      minH: 2
    };
  } else {
    // Mobile: fixed 2x2
    const { x, y, w, h } = findBestPositionAndSize(existingLayout, colCount, 2, 2, 2, 2);

    return {
      i: widgetId,
      x,
      y,
      w,
      h,
      minW: 2,
      minH: 2,
      maxW: 2,
      maxH: 2
    };
  }
};
