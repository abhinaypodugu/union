export interface OrgNode {
  id: string;
  name: string;
  /** geo levels (org/country/state/city/unit) vs functional group vs committee — visually distinct */
  type: 'org' | 'country' | 'state' | 'city' | 'unit' | 'group' | 'committee';
  /** Tenant-configured label, e.g. "State", "District", "Sector" */
  kind?: string;
  /** Right-aligned mono meta, e.g. "5 members" */
  meta?: string;
  /** Marks the viewer's own unit/committee */
  you?: boolean;
  icon?: string;
  children?: OrgNode[];
}
/**
 * Expandable organization hierarchy (geography → functional groups → committees).
 * @startingPoint section="Organization" subtitle="Org chart tree with geo, groups and committees" viewport="460x420"
 */
export interface OrgTreeProps {
  nodes: OrgNode[];
  defaultExpanded?: string[];
  selected?: string;
  onSelect?: (node: OrgNode) => void;
}
export declare function OrgTree(props: OrgTreeProps): JSX.Element;
