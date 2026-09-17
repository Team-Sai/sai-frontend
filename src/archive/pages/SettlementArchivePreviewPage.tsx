import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import '../../contract/shared.css';
import './SettlementArchivePreviewPage.css';
import { getSettlementArchivePreview } from '../api/archiveApi';
import { downloadSettlementPdf } from '../pdf/downloadSettlementPdf';
import SettlementPdfTemplate from '../pdf/SettlementPdfTemplate';
import type { SettlementArchivePreview } from '../types/archive';

export default function SettlementArchivePreviewPage() {
  const navigate = useNavigate();
  const { settlementId } = useParams<{ settlementId: string }>();
  const numericSettlementId = settlementId !== undefined ? Number(settlementId) : NaN;
  const isInvalidId = Number.isNaN(numericSettlementId);

  const [preview, setPreview] = useState<SettlementArchivePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isInvalidId) return;

    let cancelled = false;

    getSettlementArchivePreview(numericSettlementId)
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
  }, [numericSettlementId, isInvalidId]);

  async function handleDownloadClick() {
    if (!preview || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadSettlementPdf(preview.settlementId);
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

      {isInvalidId ? (
        <div className="preview-status">
          <p>잘못된 정산 번호입니다.</p>
        </div>
      ) : isLoading ? (
        <div className="preview-status">
          <p>불러오는 중이에요...</p>
        </div>
      ) : error || !preview ? (
        <div className="preview-status">
          <p>{error ?? '정산 내역을 불러올 수 없습니다.'}</p>
        </div>
      ) : (
        <div className="pdf-preview">
          <PDFViewer width="100%" height="100%" showToolbar>
            <SettlementPdfTemplate preview={preview} />
          </PDFViewer>
        </div>
      )}
    </div>
  );
}
