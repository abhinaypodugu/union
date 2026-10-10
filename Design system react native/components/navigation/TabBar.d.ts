export interface TabBarItem { value: string; label: string; icon: string; badge?: number; }
/**
 * Mobile bottom navigation (member app). 5 items max: Home, Groups, Issues, Alerts, Org.
 * @startingPoint section="Navigation" subtitle="Mobile bottom tab bar" viewport="390x90"
 */
export interface TabBarProps {
  items: TabBarItem[];
  value: string;
  onChange?: (value: string) => void;
}
export declare function TabBar(props: TabBarProps): JSX.Element;
