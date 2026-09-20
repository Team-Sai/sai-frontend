import '../components/Stepper.css';

const STEPS = ['변경 요청 확인', '변경 내용 확인', '전자서명'];

interface ChangeApprovalStepperProps {
  currentStep: 1 | 2 | 3;
}

export default function ChangeApprovalStepper({ currentStep }: ChangeApprovalStepperProps) {
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