export interface MetricTileProps {
  label: string;
  value: string | number;
  /** Context line, e.g. "+4 vs last week" */
  delta?: string;
  /** Colors the delta: up = good (green), down = bad (red) */
  trend?: 'up' | 'down';
  icon?: string;
  /** Red value — for overdue counts */
  danger?: boolean;
}
export declare function MetricTile(props: MetricTileProps): JSX.Element;
