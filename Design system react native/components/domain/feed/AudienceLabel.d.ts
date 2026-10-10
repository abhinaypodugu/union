export interface AudienceLabelProps {
  /** Who can see the content. committee/private render with a lock. */
  scope: 'org' | 'region' | 'local' | 'group' | 'committee' | 'private' | 'public';
  /** Human label e.g. "Hyderabad · IT Workers" */
  label: string;
}
export declare function AudienceLabel(props: AudienceLabelProps): JSX.Element;
