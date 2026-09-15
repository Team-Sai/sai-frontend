import type { ComponentPropsWithRef } from 'react';
import styles from './controls.module.css';

export type InputProps = ComponentPropsWithRef<'input'> & {
  variant?: 'outlined' | 'document' | 'borderless';
};

export function Input({ variant = 'outlined', className = '', ...props }: InputProps) {
  return <input {...props} className={`${styles.input} ${styles[variant]} ${className}`} />;
}
