import { cloneElement, type AriaAttributes, type ReactElement, type ReactNode } from 'react';
import styles from './controls.module.css';

type FieldControlProps = AriaAttributes & { id?: string };

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  hintId?: string;
  errorId?: string;
  className?: string;
  children: ReactElement<FieldControlProps>;
}

export function FormField({
  id, label, hint, error, hintId = `${id}-hint`, errorId = `${id}-error`,
  className, children,
}: FormFieldProps) {
  const describedBy = [...new Set([
    ...(children.props['aria-describedby']?.split(/\s+/).filter(Boolean) ?? []),
    ...(hint ? [hintId] : []), ...(error ? [errorId] : []),
  ])].join(' ') || undefined;

  return <div className={className}>
    <label htmlFor={id} className={styles.label}>{label}</label>
    {cloneElement(children, {
      id,
      'aria-invalid': error ? true : children.props['aria-invalid'],
      'aria-describedby': describedBy,
    })}
    {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
    {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
  </div>;
}
