import { useEffect, useRef } from 'react';

interface ScrollSceneOptions {
  /** 장면을 몇 단계로 나눌지. 지정하면 연속 위치 `--s`와 `data-step`(가장 가까운 단계)이 붙는다. */
  steps?: number;
  /** 매 프레임 진행도(0~1)를 받는 콜백. 리렌더 없이 DOM을 직접 만질 때 쓴다. */
  onProgress?: (progress: number, element: HTMLElement) => void;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** 한 프레임에 목표까지 남은 거리의 몇 %를 따라갈지. 작을수록 더 부드럽고 느리게 따라온다. */
const EASE = 0.14;

/**
 * 스크롤 장면의 진행도를 CSS 변수로 내려준다.
 *
 * - `--p` (0~1): 화면보다 긴 요소(안쪽에 sticky 무대가 있는 섹션)는 윗변이 화면 위에 닿을 때 0,
 *   아랫변이 화면 아래에 닿을 때 1. 화면보다 짧은 요소는 화면 아래에서 들어올 때 0, 위에 닿을 때 1.
 * - `--s` (steps를 줄 때만): 0 ~ steps-1 사이의 연속 위치. 정수 k에서 k번째 단계가 한가운데.
 *   CSS에서 `var(--k) - var(--s)`로 단계 사이를 자연스럽게 섞을 수 있다.
 *
 * 스크롤 위치를 그대로 쓰지 않고 매 프레임 조금씩 따라가게(lerp) 해서
 * 마우스 휠처럼 뚝뚝 끊기는 스크롤에서도 화면이 부드럽게 움직인다.
 * React 상태를 쓰지 않으므로 스크롤 중에 리렌더가 일어나지 않는다.
 */
export function useScrollScene<T extends HTMLElement>({ steps, onProgress }: ScrollSceneOptions = {}) {
  const ref = useRef<T>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let current = -1;

    const readTarget = () => {
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const travel = rect.height - viewport;
      return travel > 1 ? clamp(-rect.top / travel) : clamp(1 - rect.top / Math.max(viewport, 1));
    };

    const apply = (progress: number) => {
      element.style.setProperty('--p', progress.toFixed(4));
      if (steps) {
        const position = clamp(progress * steps - 0.5, 0, steps - 1);
        element.style.setProperty('--s', position.toFixed(4));
        const step = String(Math.round(position));
        if (element.dataset.step !== step) {
          element.dataset.step = step;
          element.style.setProperty('--step', step);
        }
      }
      onProgressRef.current?.(progress, element);
    };

    const tick = () => {
      frame = 0;
      const target = readTarget();
      if (current < 0 || reduceMotion.matches) {
        current = target;
      } else {
        current += (target - current) * EASE;
        if (Math.abs(target - current) < 0.0004) current = target;
      }
      apply(current);
      if (current !== target) frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [steps]);

  return ref;
}

/** 긴 sticky 장면 안에서 n번째 단계가 한가운데 오도록 부드럽게 스크롤한다. */
export function scrollToSceneStep(element: HTMLElement | null, step: number, steps: number) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const travel = rect.height - window.innerHeight;
  const top = window.scrollY + rect.top + travel * ((step + 0.5) / steps);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
}
