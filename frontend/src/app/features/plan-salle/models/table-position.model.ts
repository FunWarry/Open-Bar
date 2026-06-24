export type TableShape = 'rect' | 'circle';

export interface TablePosition {
  tableId: number;
  x: number;
  y: number;
  rotation: number;
  shape: TableShape;
}
