export interface CommitteeBadgeProps {
  name: string;
  /** Geographic tier: 1 local/city, 2 state/region, 3 national */
  level?: 1 | 2 | 3;
  /** Person's position on it, e.g. "Chair" */
  role?: string;
  size?: 'sm' | 'md';
}
export declare function CommitteeBadge(props: CommitteeBadgeProps): JSX.Element;
