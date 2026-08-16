/**
 * Supported geometric shapes for rendering tables on the Konva.js canvas.
 */
export type TableShape = 'rect' | 'circle';

/**
 * Represents the 2D spatial position and visual properties of a table on the floor plan.
 */
export interface TablePosition {
  /** Unique ID of the table. */
  tableId: number;
  /** X coordinate on the canvas grid in pixels. */
  x: number;
  /** Y coordinate on the canvas grid in pixels. */
  y: number;
  /** Custom width of the table in pixels (default 72). */
  width?: number;
  /** Custom height of the table in pixels (default 72). */
  height?: number;
  /** Rotation angle in degrees (0..360). */
  rotation: number;
  /** Geometric shape of the table. */
  shape: TableShape;
  /** Floor identifier (e.g. 'RDC', 'First Floor', 'Terrasse', 'VIP'). */
  floor?: string;
  /** Zone identifier (e.g. 'Salle Principale', 'Bar', 'VIP'). */
  zone?: string;
}

/**
 * Supported geometry shapes for visual Zone Area outlines.
 */
export type ZoneShapeType = 'rect' | 'polygon';

/**
 * Represents a visual zone boundary shape drawn on the floor plan canvas.
 */
export interface ZoneArea {
  id: string;
  nom: string;
  etage: string;
  shapeType?: ZoneShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Array of 4 independent corner radii [TopLeft, TopRight, BottomRight, BottomLeft] in pixels. */
  cornerRadii?: [number, number, number, number];
  /** Polygon curve tension (0 = sharp angles like L-corners, 0.3 = smooth curved walls). */
  tension?: number;
  /** Custom polygon vertices [x1, y1, x2, y2, ...] relative to (x, y) for custom room shapes (inner/outer angles). */
  points?: number[];
  couleur?: string;
  /** Custom label positioning offset relative to zone origin (x, y). */
  labelX?: number;
  labelY?: number;
}
