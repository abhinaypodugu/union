import { ReactNode } from 'react';
export interface SideNavItem { value: string; label: string; icon: string; badge?: number | string; alert?: boolean; }
export interface SideNavSection { heading?: string; items: SideNavItem[]; }
export interface SideNavProps {
  /** Tenant switcher header */
  org?: { name: string; scope?: string };
  sections: SideNavSection[];
  value: string;
  onChange?: (value: string) => void;
  footer?: ReactNode;
}
export declare function SideNav(props: SideNavProps): JSX.Element;
