import { ReactNode, InputHTMLAttributes } from 'react';
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  description?: ReactNode;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
export declare function Radio(props: CheckboxProps): JSX.Element;
