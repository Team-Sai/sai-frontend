import type { ComponentPropsWithRef } from 'react';
import styles from './controls.module.css';

export type TextareaProps = ComponentPropsWithRef<'textarea'> & { variant?: 'outlined' | 'document' };

export function Textarea({ variant = 'outlined', className = '', ...props }: TextareaProps) {
  return <textarea {...props} className={`${styles.textarea} ${variant === 'document' ? styles.documentBox : styles.outlined} ${className}`} />;
}
