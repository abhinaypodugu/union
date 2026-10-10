import React from 'react';
import { fonts, palette, TypeVariant } from '../../theme';
import { Txt } from '../Txt';

/** Text with bold runs: ['Your case ', { b: 'CASE-2041' }, ' moved…'] */
export type Rich = string | Array<string | { b: string }>;

export function RichText({ value, variant = 'body', color = palette.ink800, numberOfLines }: { value: Rich; variant?: TypeVariant; color?: string; numberOfLines?: number }) {
  const parts = typeof value === 'string' ? [value] : value;
  return (
    <Txt variant={variant} color={color} numberOfLines={numberOfLines}>
      {parts.map((p, i) => typeof p === 'string' ? p : <Txt key={i} variant={variant} color={palette.ink900} style={{ fontFamily: fonts.sans600 }}>{p.b}</Txt>)}
    </Txt>
  );
}
