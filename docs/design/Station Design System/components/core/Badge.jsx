import React from 'react';

/**
 * Compact status / category label. Mono-cased pill used across Station
 * for fleet readiness, contract states, plan tiers, etc.
 */
export function Badge({
  tone = 'brand',
  variant = 'soft',
  children,
  style,
  ...rest
}) {
  const palette = {
    brand: { c: 'var(--brand)', soft: 'var(--brand-subtle)' },
    warm: {
      c: 'var(--coral-500)',
      soft: 'color-mix(in srgb, var(--coral-500) 18%, transparent)',
    },
    success: {
      c: 'var(--success-500)',
      soft: 'color-mix(in srgb, var(--success-500) 16%, transparent)',
    },
    warning: {
      c: 'var(--warning-500)',
      soft: 'color-mix(in srgb, var(--warning-500) 18%, transparent)',
    },
    danger: {
      c: 'var(--danger-500)',
      soft: 'color-mix(in srgb, var(--danger-500) 16%, transparent)',
    },
    neutral: { c: 'var(--text-muted)', soft: 'var(--surface-sunken)' },
  };
  const p = palette[tone] || palette.brand;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-2xs)',
    fontWeight: 'var(--weight-semibold)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    padding: '3px 9px',
    borderRadius: 'var(--radius-pill)',
    lineHeight: 1.5,
    ...(variant === 'solid'
      ? {
          background: p.c,
          color: tone === 'brand' ? 'var(--brand-contrast)' : '#fff',
        }
      : { background: p.soft, color: p.c }),
    ...style,
  };

  return (
    <span style={base} {...rest}>
      {children}
    </span>
  );
}
