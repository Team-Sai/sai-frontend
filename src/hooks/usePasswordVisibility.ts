import { useState } from 'react';

export function usePasswordVisibility() {
  const [isVisible, setIsVisible] = useState(false);

  function toggle() {
    setIsVisible((prev) => !prev);
  }

  return {
    isVisible,
    inputType: isVisible ? 'text' : 'password',
    toggle,
    ariaLabel: isVisible ? '비밀번호 숨기기' : '비밀번호 보기',
  };
}