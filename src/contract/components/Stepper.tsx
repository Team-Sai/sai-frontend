import './Stepper.css';

const STEPS = ['본인인증', '차용증 작성', '상대확인 · 전자서명', '완료'];

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <section className="stepper-card">
      <ol className="stepper">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const stateClass = isDone ? 'is-done' : isActive ? 'is-active' : '';

          return (
            <li key={label} className={`stepper__step ${stateClass}`.trim()}>
              <span className="stepper__circle">
                {isDone ? (
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                    <path
                      d="M3 8.5 6.2 12 13 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </span>
              <span className="stepper__label">{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
