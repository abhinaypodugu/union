import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Leading Lucide icon (e.g. "search") */
  icon?: string;
  invalid?: boolean;
  size?: 'sm' | 'md';
}
export declare function Input(props: InputProps): JSX.Element;
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { invalid?: boolean; }
export declare function Textarea(props: TextareaProps): JSX.Element;
