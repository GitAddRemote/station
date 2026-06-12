import * as React from 'react';

/**
 * Compact status / category label (mono-cased pill).
 *
 * @startingPoint section="Core" subtitle="Status & category pill" viewport="700x150"
 */
export interface BadgeProps {
  /** Semantic color. */
  tone?: 'brand' | 'warm' | 'success' | 'warning' | 'danger' | 'neutral';
  /** `soft` = tinted background (default), `solid` = filled. */
  variant?: 'soft' | 'solid';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
