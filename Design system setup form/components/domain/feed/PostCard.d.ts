import { ReactNode } from 'react';
/**
 * Feed item. Three content types must stay visually distinct (PRD §14.4).
 * @startingPoint section="Feed" subtitle="Member post, official announcement, committee-private" viewport="420x560"
 */
export interface PostCardProps {
  /** member = ordinary post · official = announcement (blue flag, seal) · committee = private channel (dashed, lock) */
  kind?: 'member' | 'official' | 'committee';
  author: { name: string; role?: string; official?: boolean };
  /** Source group, e.g. "Hyderabad · IT Workers" */
  source?: string;
  audience?: { scope: 'org' | 'region' | 'local' | 'group' | 'committee' | 'private' | 'public'; label: string };
  time?: string;
  /** Serif headline — use for official announcements */
  title?: ReactNode;
  body?: ReactNode;
  /** Image URL, or a placeholder caption string */
  media?: string | boolean;
  pinned?: boolean;
  likes?: number;
  comments?: number;
  liked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}
export declare function PostCard(props: PostCardProps): JSX.Element;
