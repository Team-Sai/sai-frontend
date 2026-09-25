import { useEffect, useState } from 'react';
import LoadingSkeleton from '../common/components/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';
import '../contract/shared.css';
import './ArchivePage.css';
import { getArchiveContracts, getArchiveSettlements } from './api/archiveApi';
import { downloadContractPdf } from './pdf/downloadContractPdf';
import { downloadSettlementPdf } from './pdf/downloadSettlementPdf';
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
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const requestKey = `${activeTab}:${page}`;
  const isLoading = loadedKey !== requestKey;
  const visibleError = error?.key === requestKey ? error.message : null;

  useEffect(() => {
    let cancelled = false;
    if (activeTab === 'contract') {
      getArchiveContracts(page)
        .then((data) => {
          if (cancelled) return;
          setContractData(data);
        })
        .catch(() => {
          if (cancelled) return;
          setError({ key: requestKey, message: '보관함을 불러올 수 없습니다.' });
        })
        .finally(() => {
          if (!cancelled) setLoadedKey(requestKey);
        });
    } else {
      getArchiveSettlements()
        .then((data) => {
          if (cancelled) return;
          setSettlements(data);
        })
        .catch(() => {
          if (cancelled) return;
          setError({ key: requestKey, message: '보관함을 불러올 수 없습니다.' });
        })
        .finally(() => {
          if (!cancelled) setLoadedKey(requestKey);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, page, requestKey]);

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
    <main className="page archive-container">
      <div className="archive-heading">
        <h1 className="archive-title">보관함</h1>
      </div>

      <div className="archive-tabs" role="tablist" aria-label="보관함 항목 유형">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'contract'}
          onClick={() => handleTabChange('contract')}
        >
          차용증
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'settlement' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'settlement'}
          onClick={() => handleTabChange('settlement')}
        >
          정산
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton className="loading-skeleton--page" rows={7} />
      ) : visibleError ? (
        <div className="error-state" role="alert">
          <h2>보관함을 불러오지 못했습니다.</h2>
          <p>{visibleError}</p>
        </div>
      ) : activeTab === 'contract' ? (
        <>
          <div className="archive-list">
            {!contractData || contractData.contracts.length === 0 ? (
              <div className="empty-state">
                <h2>보관된 차용증이 없습니다.</h2>
                <p>완료한 차용증을 보관하면 이곳에서 다시 확인할 수 있습니다.</p>
              </div>
            ) : (
              contractData.contracts.map((contract) => (
                <div
                  key={contract.contractId}
                  className="archive-card"
                  onClick={() => navigate(`/archive/contracts/${contract.contractId}`)}
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
                      <>{downloadingId === contract.contractId && <span className="button-spinner" aria-hidden="true" />}PDF 다운로드</>
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
            <div className="empty-state">
              <h2>보관된 정산이 없습니다.</h2>
              <p>완료한 정산을 보관하면 이곳에서 다시 확인할 수 있습니다.</p>
            </div>
          ) : (
            settlements.map((settlement) => (
              <div
                key={settlement.settlementId}
                className="archive-card"
                onClick={() => navigate(`/archive/settlements/${settlement.settlementId}`)}
              >
                <div className="archive-card-main">
                  <div className="archive-card-title">
                    <span className="archive-item-name">{settlement.title}</span>
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
                    <>{downloadingId === settlement.settlementId && <span className="button-spinner" aria-hidden="true" />}PDF 다운로드</>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
