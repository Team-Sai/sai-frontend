import { useState } from 'react';
import { Button } from '../../common/components';
import type { ContractRelationType } from '../types/contract';
import './RelationModal.css';

interface RelationModalProps {
  onClose: () => void;
  onConfirm: (relation: ContractRelationType) => void;
}

export default function RelationModal({ onClose, onConfirm }: RelationModalProps) {
  const [selected, setSelected] = useState<ContractRelationType | null>(null);

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
  }

  return (
    <div className="relation-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="relationNoticeTitle">
      <div className="relation-modal">
        <header className="relation-modal__header">
          <span className="relation-modal__eyebrow" id="relationNoticeTitle">안내문</span>
          <Button type="button" variant="text" className="relation-modal__close" onClick={onClose} aria-label="닫기">
            ×
          </Button>
        </header>

        <div className="relation-modal__body">
          <div className="relation-modal__intro">
            <h2 className="relation-modal__question">거래 상대방과의 관계를 선택해 주세요</h2>
            <p className="relation-modal__desc">선택한 관계에 따라 계약 작성 절차가 달라질 수 있어요.</p>
          </div>

          <div className="relation-options" role="radiogroup" aria-label="거래 당사자와의 관계">
            <button
              type="button"
              className="relation-option"
              role="radio"
              aria-checked={selected === 'FAMILY'}
              onClick={() => setSelected('FAMILY')}
            >
              <span className="relation-option__label">가족·친인척</span>
              <span className="relation-option__detail">배우자, 직계가족, 형제자매</span>
            </button>
            <button
              type="button"
              className="relation-option"
              role="radio"
              aria-checked={selected === 'ACQUAINTANCE'}
              onClick={() => setSelected('ACQUAINTANCE')}
            >
              <span className="relation-option__label">지인·기타</span>
              <span className="relation-option__detail">친구, 지인, 기타관계</span>
            </button>
          </div>
        </div>

        <footer className="relation-modal__footer">
          <Button type="button" fullWidth disabled={!selected} onClick={handleConfirm}>
            확인
          </Button>
        </footer>
      </div>
    </div>
  );
}
