import { Button } from '../../common/components';
import styles from './DocumentActions.module.css';

interface ContractActionsProps {
  isProcessing: boolean;
  statusMessage: string | null;
  isError: boolean;
  onNext: () => void;
}

export default function ContractActions({ isProcessing, statusMessage, isError, onNext }: ContractActionsProps) {
  return (
    <>
      <p className="doc__disclaimer">
        본 서비스가 제공하는 차용증 양식은 일반적인 금전소비대차 계약서 작성 편의를 위한 참고용 문서입니다. 서비스
        제공자는 이용자가 입력한 데이터의 정확성 및 개별 계약 조건에 따른 법적 분쟁에 대해 책임을 지지 않습니다.
        구체적인 법적 조언이나 강제집행력이 필요한 경우 법률 전문가의 상담 또는 공증 절차를 진행하시길 권장합니다.
      </p>

      <div className={styles.actions}>
        <Button type="button" className={styles.primary} onClick={onNext} disabled={isProcessing} isLoading={isProcessing}>
          {isProcessing ? '확인 중...' : '다음 (전자서명)'}
        </Button>
      </div>

      <p className={`${styles.status} ${isError ? styles.error : ''}`} role="status" aria-live="polite">
        {statusMessage}
      </p>
    </>
  );
}
