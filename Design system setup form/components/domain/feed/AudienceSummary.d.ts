/**
 * Publish-time audience preview + "Notify audience" toggle (PRD §8.3).
 * @startingPoint section="Feed" subtitle="Audience preview and Notify audience toggle" viewport="460x180"
 */
export interface AudienceSummaryProps {
  /** Selected audience segments (only ones the author is authorized to target) */
  segments: string[];
  /** Server-resolved recipient count */
  count: number | string;
  notify?: boolean;
  onNotifyChange?: (v: boolean) => void;
  /** False when author lacks push permission */
  canNotify?: boolean;
  onRemove?: (segment: string) => void;
}
export declare function AudienceSummary(props: AudienceSummaryProps): JSX.Element;
