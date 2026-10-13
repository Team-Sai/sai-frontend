import type { ComponentPropsWithRef } from 'react';
import styles from './controls.module.css';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'text';
  controlSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
};

export function Button({
  variant = 'primary', controlSize = 'md', fullWidth = false,
  isLoading = false, disabled, type = 'button', className = '', children, ...props
}: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || isLoading}
    aria-busy={isLoading || props['aria-busy']}
    className={`${styles.button} ${styles[variant]} ${styles[controlSize]} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
    {isLoading && <span className="button-spinner" aria-hidden="true" />}{children}
  </button>;
}
