import type { ComponentPropsWithRef } from 'react';
import styles from './controls.module.css';

export type SelectProps = ComponentPropsWithRef<'select'> & { variant?: 'outlined' | 'document' };

export function Select({ variant = 'outlined', className = '', ...props }: SelectProps) {
  return <select {...props} className={`${styles.select} ${variant === 'document' ? styles.documentBox : styles.outlined} ${className}`} />;
}
