import { usePasswordVisibility } from '../hooks/usePasswordVisibility';
import { Button } from './Button';
import { Input, type InputProps } from './Input';
import styles from './controls.module.css';

export type PasswordInputProps = Omit<InputProps, 'type' | 'variant'>;

export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const password = usePasswordVisibility();
  return <div className={styles.password}>
    <Input {...props} type={password.inputType} className={`${styles.passwordInput} ${className}`} />
    <Button variant="text" className={styles.passwordToggle}
      aria-label={password.ariaLabel} aria-pressed={password.isVisible}
      disabled={props.disabled} onClick={password.toggle}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {password.isVisible ? <>
          <path d="m2 2 20 20" />
          <path d="M6.71 6.71C4.93 7.9 3.57 9.62 2.81 11.65a1 1 0 0 0 0 .7C4.32 16.12 7.89 18.5 12 18.5c1.18 0 2.29-.2 3.31-.56" />
          <path d="M10.73 10.73a2 2 0 0 0 2.54 2.54" />
          <path d="M14.12 5.68A9.95 9.95 0 0 0 12 5.5c-4.11 0-7.68 2.38-9.19 6.15" />
          <path d="M16.61 7.39c2.05 1.15 3.63 3 4.58 5.26a1 1 0 0 1 0 .7 10.1 10.1 0 0 1-1.46 2.4" />
        </> : <>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.574 7.884 7.269 5.5 12 5.5s8.426 2.384 9.938 6.152a1 1 0 0 1 0 .696C20.426 16.116 16.731 18.5 12 18.5S3.574 16.116 2.062 12.348Z" />
          <circle cx="12" cy="12" r="3" />
        </>}
      </svg>
    </Button>
  </div>;
}
