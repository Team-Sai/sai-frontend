import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import '../../contract/shared.css';
import './SettlementArchivePreviewPage.css';
import { getLoanContract, getContractSignatures, type ContractSignatures } from '../../contract/api/contractApi';
import { downloadContractPdf } from '../pdf/downloadContractPdf';
import ContractPdfTemplate from '../pdf/ContractPdfTemplate';
import type { LoanContractResponse } from '../../contract/types/contract';

const EMPTY_SIGNATURES: ContractSignatures = {
  creditorSignatureDataUri: null,
  debtorSignatureDataUri: null,
};

export default function ContractArchivePreviewPage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const numericContractId = contractId !== undefined ? Number(contractId) : NaN;
  const isInvalidId = Number.isNaN(numericContractId);

  const [contract, setContract] = useState<LoanContractResponse | null>(null);
  const [creditorSignatureDataUri, setCreditorSignatureDataUri] = useState<string | null>(null);
  const [debtorSignatureDataUri, setDebtorSignatureDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isInvalidId) return;

    let cancelled = false;

    Promise.all([
      getLoanContract(numericContractId),
      getContractSignatures(numericContractId).catch((error) => {
        console.error('[ContractArchivePreviewPage] 서명 이미지 조회 실패, 서명 없이 진행합니다', error);
        return EMPTY_SIGNATURES;
      }),
    ])
      .then(([contractData, signatures]) => {
        if (cancelled) return;
        setContract(contractData);
        setCreditorSignatureDataUri(signatures.creditorSignatureDataUri);
        setDebtorSignatureDataUri(signatures.debtorSignatureDataUri);
      })
      .catch(() => {
        if (cancelled) return;
        setError('차용증 내역을 불러올 수 없습니다.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [numericContractId, isInvalidId]);

  async function handleDownloadClick() {
    if (!contract || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadContractPdf(contract.contractId);
    } catch {
      alert('차용증 PDF 생성 중 오류가 발생했습니다.');
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
        <button type="button" className="btn btn--primary" onClick={handleDownloadClick} disabled={isDownloading || !contract}>
          {isDownloading ? '다운로드 중...' : 'PDF 다운로드'}
        </button>
      </div>

      {isInvalidId ? (
        <div className="preview-status">
          <p>잘못된 차용증 번호입니다.</p>
        </div>
      ) : isLoading ? (
        <div className="preview-status">
          <p>불러오는 중이에요...</p>
        </div>
      ) : error || !contract ? (
        <div className="preview-status">
          <p>{error ?? '차용증 내역을 불러올 수 없습니다.'}</p>
        </div>
      ) : (
        <div className="pdf-preview">
          <PDFViewer width="100%" height="100%" showToolbar>
            <ContractPdfTemplate
              contract={contract}
              creditorSignatureDataUri={creditorSignatureDataUri}
              debtorSignatureDataUri={debtorSignatureDataUri}
            />
          </PDFViewer>
        </div>
      )}
    </div>
  );
}
