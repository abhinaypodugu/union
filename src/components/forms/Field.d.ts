import { ReactNode } from 'react';
export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  /** Replaces hint and turns red */
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children?: ReactNode;
}
export declare function Field(props: FieldProps): JSX.Element;
