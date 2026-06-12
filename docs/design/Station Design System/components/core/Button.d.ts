import * as React from 'react';

/**
 * Primary action button for Presstronic & Station surfaces.
 * Token-driven: adapts to light/dark and the active sub-brand.
 *
 * @startingPoint section="Core" subtitle="Token-driven action button" viewport="700x180"
 */
export interface ButtonProps {
  /** Visual style. `primary` = cornflower-blue brand, `warm` = coral accent. */
  variant?: 'primary' | 'warm' | 'ghost' | 'subtle';
  /** Control size. */
  size?: 'sm' | 'md' | 'lg';
  /** Render as an anchor when set. */
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** Optional leading icon node (e.g. a Lucide <i> or svg). */
  iconLeft?: React.ReactNode;
  /** Optional trailing icon node. */
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
