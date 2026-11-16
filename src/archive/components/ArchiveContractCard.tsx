import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoanContractResponse } from '../../contract/types/contract';
import { loadContractVersions } from '../api/contractVersions';
import {
  ARCHIVE_CONTRACT_STATUS_LABELS,
  ARCHIVE_ROLE_LABELS,
  type ArchiveContractRow,
} from '../types/archive';

export type ContractDownloadKind = 'contract' | 'repayment';

interface ArchiveContractCardProps {
  contract: ArchiveContractRow;
  /** 현재 진행 중인 다운로드 키 (`${kind}:${contractId}`) */
  downloadingId: string | null;
  onDownload: (kind: ContractDownloadKind, contractId: number) => void;
}

type VersionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; versions: LoanContractResponse[] };

function versionDescription(index: number): string {
  return index === 0 ? '최초 계약' : `${index}차 변경 계약`;
}

function formatAmount(amount: number | null | undefined): string {
  return amount != null ? `${amount.toLocaleString('ko-KR')}원` : '-';
}

export default function ArchiveContractCard({
  contract,
  downloadingId,
  onDownload,
}: ArchiveContractCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [versionsState, setVersionsState] = useState<VersionsState>({ status: 'idle' });

  const panelId = `archive-contract-versions-${contract.contractId}`;

  function fetchVersions() {
    setVersionsState({ status: 'loading' });
    loadContractVersions(contract.contractId)
      .then((versions) => setVersionsState({ status: 'loaded', versions }))
      .catch((error) => {
        console.error('[ArchiveContractCard] 계약 버전 조회 실패', error);
        setVersionsState({ status: 'error' });
      });
  }

  function handleToggle() {
    const next = !isExpanded;
    setIsExpanded(next);
    // 처음 펼칠 때만 버전 체인을 조회하고 이후에는 캐시를 사용한다.
    if (next && (versionsState.status === 'idle' || versionsState.status === 'error')) {
      fetchVersions();
    }
  }

  function handleDownloadClick(
    event: React.MouseEvent,
    kind: ContractDownloadKind,
    contractId: number,
  ) {
    event.stopPropagation();
    onDownload(kind, contractId);
  }

  return (
    <div className={`archive-contract-item ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="archive-card archive-card--toggle">
        <button
          type="button"
          className="archive-card-toggle"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={handleToggle}
        >
          <div className="archive-card-main">
            <div className="archive-card-title">
              <span className="archive-item-name">{contract.contractAlias}</span>
              <span className={`role-badge ${contract.role === 'CREDITOR' ? 'creditor' : 'debtor'}`}>
                {ARCHIVE_ROLE_LABELS[contract.role]}
              </span>
              <span className={`status-pill ${contract.contractStatus === 'ONGOING' ? 'ongoing' : 'completed'}`}>
                {ARCHIVE_CONTRACT_STATUS_LABELS[contract.contractStatus]}
              </span>
            </div>
            <div className="archive-card-sub">
              원금 {formatAmount(contract.principalAmount)} · 만기 {contract.maturityDate}
            </div>
          </div>
          <span className="archive-card-toggle__label">
            {versionsState.status === 'loaded' && versionsState.versions.length > 1
              ? `계약서 ${versionsState.versions.length}건`
              : '계약서 보기'}
            <span className="archive-card-toggle__chevron" aria-hidden="true" />
          </span>
        </button>
      </div>

      {isExpanded && (
        <div id={panelId} className="archive-version-panel">
          {versionsState.status === 'loading' || versionsState.status === 'idle' ? (
            <div className="archive-version-status">
              <span className="button-spinner" aria-hidden="true" />
              계약서 버전을 불러오는 중입니다.
            </div>
          ) : versionsState.status === 'error' ? (
            <div className="archive-version-status" role="alert">
              계약서 버전을 불러오지 못했습니다.
              <button type="button" className="archive-version-retry" onClick={fetchVersions}>
                다시 시도
              </button>
            </div>
          ) : (
            <ul className="archive-version-list">
              {versionsState.versions.map((version, index) => {
                const isCurrent = index === versionsState.versions.length - 1;
                const repaymentKey = `repayment:${version.contractId}`;
                const contractKey = `contract:${version.contractId}`;

                return (
                  <li
                    key={version.contractId}
                    className={`archive-version-row ${isCurrent ? 'is-current' : ''}`}
                    onClick={() => navigate(`/archive/contracts/${version.contractId}`)}
                  >
                    <div className="archive-version-info">
                      <div className="archive-version-title">
                        <span className="version-badge">V{index + 1}</span>
                        <span className="archive-version-name">{versionDescription(index)}</span>
                        {isCurrent ? (
                          <span className="version-current">현재</span>
                        ) : (
                          <span className="version-ended">종료</span>
                        )}
                      </div>
                      <div className="archive-card-sub">
                        원금 {formatAmount(version.principalAmount)} · 이율 {version.interestRate ?? '-'}% ·{' '}
                        {version.startDate ?? '-'} ~ {version.maturityDate ?? '-'}
                      </div>
                    </div>
                    <div className="card-actions">
                      {/* 변경 전 계약(종료)도 해당 버전까지의 상환내역서를 열람할 수 있다. */}
                      <button
                        type="button"
                        className="btn-pdf-download"
                        disabled={downloadingId !== null}
                        onClick={(event) => handleDownloadClick(event, 'repayment', version.contractId)}
                      >
                        {downloadingId === repaymentKey && <span className="button-spinner" aria-hidden="true" />}
                        상환내역서 다운로드
                      </button>
                      <button
                        type="button"
                        className="btn-pdf-download"
                        disabled={downloadingId !== null}
                        onClick={(event) => handleDownloadClick(event, 'contract', version.contractId)}
                      >
                        {downloadingId === contractKey && <span className="button-spinner" aria-hidden="true" />}
                        PDF 다운로드
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
