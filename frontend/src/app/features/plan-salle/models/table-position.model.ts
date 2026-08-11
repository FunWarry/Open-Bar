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
  /** Rotation angle in degrees (0..360). */
  rotation: number;
  /** Geometric shape of the table. */
  shape: TableShape;
  /** Optional floor identifier (e.g. 'RDC', '1er Étage', 'Terrasse'). */
  floor?: string;
  /** Optional zone identifier (e.g. 'Bar', 'Salle Principal', 'VIP'). */
  zone?: string;
}
