import React from 'react';

/**
 * Presstronic / Station primary action button.
 * Styled entirely from design-system tokens so it adapts to light/dark
 * and to the Station sub-brand automatically.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  href,
  disabled = false,
  iconLeft,
  iconRight,
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: { padding: '9px 16px', fontSize: 'var(--text-sm)' },
    md: { padding: '13px 22px', fontSize: 'var(--text-sm)' },
    lg: { padding: '16px 28px', fontSize: 'var(--text-base)' },
  };

  const variants = {
    primary: {
      background: 'var(--brand)',
      color: 'var(--brand-contrast)',
      borderColor: 'transparent',
      boxShadow: 'var(--glow-aqua)',
    },
    warm: {
      background: 'var(--coral-500)',
      color: 'var(--white)',
      borderColor: 'transparent',
      boxShadow: 'var(--glow-coral)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-strong)',
      borderColor: 'var(--border-strong)',
      boxShadow: 'none',
    },
    subtle: {
      background: 'var(--brand-subtle)',
      color: 'var(--brand)',
      borderColor: 'transparent',
      boxShadow: 'none',
    },
  };

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'var(--weight-semibold)',
    lineHeight: 1,
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition:
      'transform 120ms cubic-bezier(0.22,1,0.36,1), background 200ms, box-shadow 200ms, border-color 200ms',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    ...sizes[size],
    ...variants[variant],
    ...style,
  };

  const content = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} style={base} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} style={base} {...rest}>
      {content}
    </button>
  );
}
