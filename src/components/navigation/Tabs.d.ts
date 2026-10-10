export interface TabItem { label: string; value?: string; count?: number; }
export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
}
/** Underline tabs for page-level sections (Queue · Overdue · Escalated). */
export declare function Tabs(props: TabsProps): JSX.Element;
export interface SegmentedControlProps {
  items: Array<string | { label: string; value?: string }>;
  value: string;
  onChange?: (value: string) => void;
  block?: boolean;
}
/** Pill toggle for 2–4 peer views, e.g. feed filters For you / My groups / Announcements. */
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
