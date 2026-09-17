import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../contract/shared.css';
import './ArchivePage.css';
import {
  downloadContractPdf,
  downloadSettlementPdf,
  getArchiveContracts,
  getArchiveSettlements,
} from './api/archiveApi';
import {
  ARCHIVE_CONTRACT_STATUS_LABELS,
  ARCHIVE_ROLE_LABELS,
  ARCHIVE_SETTLEMENT_STATUS_LABELS,
  ARCHIVE_SETTLEMENT_TYPE_LABELS,
  type ArchiveContractListResponse,
  type ArchiveSettlementRow,
} from './types/archive';

type ArchiveTabType = 'contract' | 'settlement';

export default function ArchivePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ArchiveTabType>('contract');
  const [page, setPage] = useState(1);

  const [contractData, setContractData] = useState<ArchiveContractListResponse | null>(null);
  const [settlements, setSettlements] = useState<ArchiveSettlementRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    if (activeTab === 'contract') {
      getArchiveContracts(page)
        .then((data) => {
          if (cancelled) return;
          setContractData(data);
        })
        .catch(() => {
          if (cancelled) return;
          setError('보관함을 불러올 수 없습니다.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    } else {
      getArchiveSettlements()
        .then((data) => {
          if (cancelled) return;
          setSettlements(data);
        })
        .catch(() => {
          if (cancelled) return;
          setError('보관함을 불러올 수 없습니다.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, page]);

  function handleTabChange(tab: ArchiveTabType) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
  }

  async function handleContractPdfClick(event: React.MouseEvent, contractId: number) {
    event.stopPropagation();
    if (downloadingId !== null) return;

    setDownloadingId(contractId);
    try {
      await downloadContractPdf(contractId);
    } catch {
      alert('차용증 PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSettlementPdfClick(event: React.MouseEvent, settlementId: number) {
    event.stopPropagation();
    if (downloadingId !== null) return;

    setDownloadingId(settlementId);
    try {
      await downloadSettlementPdf(settlementId);
    } catch {
      alert('정산 PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="page archive-container">
      <div className="archive-heading">
        <h1 className="archive-title">보관함</h1>
        <p className="archive-subtitle">저장된 차용증과 정산 기록을 눌러 상세 화면을 확인하세요.</p>
      </div>

      <div className="archive-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
          onClick={() => handleTabChange('contract')}
        >
          차용증
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'settlement' ? 'active' : ''}`}
          onClick={() => handleTabChange('settlement')}
        >
          정산
        </button>
      </div>

      {isLoading ? (
        <div className="empty-state">불러오는 중이에요...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : activeTab === 'contract' ? (
        <>
          <div className="archive-list">
            {!contractData || contractData.contracts.length === 0 ? (
              <div className="empty-state">보관된 차용증이 없습니다.</div>
            ) : (
              contractData.contracts.map((contract) => (
                <div
                  key={contract.contractId}
                  className="archive-card"
                  onClick={() => navigate(`/contracts/${contract.contractId}/contract-detail`)}
                >
                  <div className="archive-card-main">
                    <div className="archive-card-title">
                      {contract.contractAlias}
                      <span className={`role-badge ${contract.role === 'CREDITOR' ? 'creditor' : 'debtor'}`}>
                        {ARCHIVE_ROLE_LABELS[contract.role]}
                      </span>
                      <span className={`status-pill ${contract.contractStatus === 'ONGOING' ? 'ongoing' : 'completed'}`}>
                        {ARCHIVE_CONTRACT_STATUS_LABELS[contract.contractStatus]}
                      </span>
                    </div>
                    <div className="archive-card-sub">
                      원금 {contract.principalAmount.toLocaleString('ko-KR')}원 · 만기 {contract.maturityDate}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn-pdf-download"
                      disabled={downloadingId !== null}
                      onClick={(event) => handleContractPdfClick(event, contract.contractId)}
                    >
                      {downloadingId === contract.contractId ? '다운로드 중...' : 'PDF 다운로드'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {contractData && contractData.totalPages > 1 && (
            <div className="pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                이전
              </button>
              <span className="pager-label">
                {contractData.currentPage} / {contractData.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= contractData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="archive-list">
          {!settlements || settlements.length === 0 ? (
            <div className="empty-state">보관된 정산이 없습니다.</div>
          ) : (
            settlements.map((settlement) => (
              <div
                key={settlement.settlementId}
                className="archive-card"
                onClick={() => navigate(`/archive/settlements/${settlement.settlementId}`)}
              >
                <div className="archive-card-main">
                  <div className="archive-card-title">
                    {settlement.title}
                    <span className={`role-badge ${settlement.settlementType === 'RECURRING' ? 'recurring' : 'shared'}`}>
                      {ARCHIVE_SETTLEMENT_TYPE_LABELS[settlement.settlementType]}
                    </span>
                    <span className={`status-pill ${settlement.settlementStatus === 'CLOSED' ? 'completed' : 'ongoing'}`}>
                      {ARCHIVE_SETTLEMENT_STATUS_LABELS[settlement.settlementStatus]}
                    </span>
                  </div>
                  <div className="archive-card-sub">
                    {settlement.settlementType === 'RECURRING' && settlement.startDate && settlement.endDate
                      ? `기간 ${settlement.startDate} ~ ${settlement.endDate}`
                      : `마감일 ${settlement.dueDate ?? settlement.endDate ?? '-'}`}
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn-pdf-download"
                    disabled={downloadingId !== null}
                    onClick={(event) => handleSettlementPdfClick(event, settlement.settlementId)}
                  >
                    {downloadingId === settlement.settlementId ? '다운로드 중...' : 'PDF 다운로드'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
