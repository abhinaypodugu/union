export interface AvatarProps {
  name: string;
  /** Photo URL; falls back to initials on a name-derived tint */
  src?: string;
  size?: number;
  /** Blue check seal — verified official/leader account */
  official?: boolean;
  /** Accent ring — e.g. current committee member */
  ring?: boolean;
}
export declare function Avatar(props: AvatarProps): JSX.Element;
export declare function AvatarStack(props: { names: string[]; size?: number; max?: number }): JSX.Element;
