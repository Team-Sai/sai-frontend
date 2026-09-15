import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../contract/shared.css';
import './SettlementArchivePreviewPage.css';
import { downloadSettlementPdf, getSettlementArchivePreview } from '../api/archiveApi';
import {
  ARCHIVE_SETTLEMENT_STATUS_LABELS,
  ARCHIVE_SETTLEMENT_TYPE_LABELS,
  SETTLEMENT_SOURCE_TYPE_LABELS,
  SETTLEMENT_SPLIT_TYPE_LABELS,
  type SettlementArchivePreview,
} from '../types/archive';

const OBLIGATION_STATUS_BADGE: Record<string, { className: string; label: string }> = {
  PAID: { className: 'status-badge--paid', label: '완납' },
  PARTIALLY_PAID: { className: 'status-badge--partial', label: '부분납부' },
  UNPAID: { className: 'status-badge--unpaid', label: '미납' },
};

function formatAmount(amount: number | null | undefined): string {
  return `${Number(amount ?? 0).toLocaleString('ko-KR')}원`;
}

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SettlementArchivePreviewPage() {
  const navigate = useNavigate();
  const { settlementId } = useParams<{ settlementId: string }>();

  const [preview, setPreview] = useState<SettlementArchivePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!settlementId) return;
    let cancelled = false;

    getSettlementArchivePreview(Number(settlementId))
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
      })
      .catch(() => {
        if (cancelled) return;
        setError('정산 내역을 불러올 수 없습니다.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [settlementId]);

  async function handleDownloadClick() {
    if (!settlementId || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadSettlementPdf(Number(settlementId));
    } catch {
      alert('정산 PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="page preview-page">
      <div className="preview-toolbar">
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/archive')}>
          목록으로
        </button>
        <button type="button" className="btn btn--primary" onClick={handleDownloadClick} disabled={isDownloading || !preview}>
          {isDownloading ? '다운로드 중...' : 'PDF 다운로드'}
        </button>
      </div>

      {isLoading ? (
        <div className="doc">
          <p className="doc__notice">불러오는 중이에요...</p>
        </div>
      ) : error || !preview ? (
        <div className="doc">
          <p className="doc__notice">{error ?? '정산 내역을 불러올 수 없습니다.'}</p>
        </div>
      ) : (
        <div className="doc" id="docRoot">
          <div className="doc__header">
            <h1 className="doc__title">정 산 내 역 서</h1>
            <div className="doc__ref">
              <span>{preview.settlementDisplayId}</span>
              <span className="doc__ref-sep">·</span>
              <span>{preview.documentVersion}</span>
            </div>
          </div>

          <section className="doc__article">
            <span className="doc__clause">정산 기본정보</span>
            <table className="info-table">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="info-table__label">정산 ID</th>
                  <td className="info-table__value">{preview.settlementId}</td>
                  <th className="info-table__label">정산명</th>
                  <td className="info-table__value">{preview.title}</td>
                </tr>
                <tr>
                  <th className="info-table__label">생성자</th>
                  <td className="info-table__value">{preview.ownerName}</td>
                  <th className="info-table__label">생성일</th>
                  <td className="info-table__value">{formatDateTime(preview.createdAt)}</td>
                </tr>
                <tr>
                  <th className="info-table__label">유형</th>
                  <td className="info-table__value">{ARCHIVE_SETTLEMENT_TYPE_LABELS[preview.settlementType] ?? preview.settlementType}</td>
                  <th className="info-table__label">분담방식</th>
                  <td className="info-table__value">{SETTLEMENT_SPLIT_TYPE_LABELS[preview.splitType] ?? preview.splitType}</td>
                </tr>
                <tr>
                  <th className="info-table__label">정산상태</th>
                  <td className="info-table__value">{ARCHIVE_SETTLEMENT_STATUS_LABELS[preview.settlementStatus] ?? preview.settlementStatus}</td>
                  <th className="info-table__label">마감일</th>
                  <td className="info-table__value">{preview.dueDate ?? '-'}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="doc__article">
            <span className="doc__clause">정산 금액 및 이행현황</span>
            <table className="info-table">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="info-table__label">총 정산금액</th>
                  <td className="info-table__value doc__readonly">{formatAmount(preview.paymentStatus.totalExpectedAmount)}</td>
                  <th className="info-table__label">확인된 납부금</th>
                  <td className="info-table__value doc__readonly">{formatAmount(preview.paymentStatus.totalPaidAmount)}</td>
                </tr>
                <tr>
                  <th className="info-table__label">미납금</th>
                  <td className="info-table__value doc__readonly">{formatAmount(preview.paymentStatus.totalRemainingAmount)}</td>
                  <th className="info-table__label">진행률</th>
                  <td className="info-table__value">{preview.paymentStatus.progressRate ?? 0}%</td>
                </tr>
                <tr>
                  <th className="info-table__label">완납</th>
                  <td className="info-table__value">{preview.paymentStatus.paidCount ?? 0}명</td>
                  <th className="info-table__label">부분납부 / 미납</th>
                  <td className="info-table__value">
                    {preview.paymentStatus.partiallyPaidCount ?? 0}명 / {preview.paymentStatus.unpaidCount ?? 0}명
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="doc__article">
            <span className="doc__clause">수취 계좌</span>
            {preview.settlementAccount ? (
              <table className="info-table">
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th className="info-table__label">은행</th>
                    <td className="info-table__value">{preview.settlementAccount.bankName}</td>
                    <th className="info-table__label">예금주</th>
                    <td className="info-table__value">{preview.settlementAccount.accountHolderName}</td>
                  </tr>
                  <tr>
                    <th className="info-table__label">계좌번호</th>
                    <td className="info-table__value" colSpan={3}>
                      {preview.settlementAccount.maskedAccountNumber}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="doc__notice">설정된 정산 수취 계좌가 없습니다.</p>
            )}
          </section>

          <section className="doc__article">
            <span className="doc__clause">참여자별 납부 현황</span>
            <table className="data-table">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>참여자</th>
                  <th>최초 부담금</th>
                  <th>현재 납부금</th>
                  <th>진행상태</th>
                </tr>
              </thead>
              <tbody>
                {preview.paymentStatus.obligations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="data-table__empty">
                      참여자 납부 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  preview.paymentStatus.obligations.map((obligation) => {
                    const badge = OBLIGATION_STATUS_BADGE[obligation.paymentStatus] ?? OBLIGATION_STATUS_BADGE.UNPAID;
                    return (
                      <tr key={obligation.paymentObligationId}>
                        <td>{obligation.participantName}</td>
                        <td className="data-table__amount">{formatAmount(obligation.expectedAmount)}</td>
                        <td className="data-table__amount">{formatAmount(obligation.paidAmount)}</td>
                        <td>
                          <span className={`status-badge ${badge.className}`}>{badge.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="doc__article">
            <span className="doc__clause">상세 납부 및 계좌 거래 내역</span>
            <table className="data-table">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '34%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>납부자</th>
                  <th>승인 금액</th>
                  <th>처리방식</th>
                  <th>거래 상대방</th>
                </tr>
              </thead>
              <tbody>
                {preview.paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="data-table__empty">
                      확인된 납부·거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  preview.paymentHistory.map((record) => (
                    <tr key={record.paymentRecordId}>
                      <td>{formatDateTime(record.recordedAt)}</td>
                      <td>{record.payerName}</td>
                      <td className="data-table__amount">{formatAmount(record.amount)}</td>
                      <td>{SETTLEMENT_SOURCE_TYPE_LABELS[record.sourceType] ?? '수동'}</td>
                      <td>{record.counterpartyName ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="doc__article doc__article--notice">
            <span className="doc__clause">[기록 검증 및 유의사항]</span>
            <p className="doc__notice">
              이 미리보기는 지금 시점의 정산 이행현황을 기준으로 조회한 화면입니다. PDF로 다운로드하면 다운로드 시점의
              데이터로 기록이 고정되어 저장됩니다.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
