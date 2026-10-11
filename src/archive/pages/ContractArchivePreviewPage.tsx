import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { PDFViewer } from "@react-pdf/renderer";

import LoadingSkeleton from "../../common/components/LoadingSkeleton";

import "../../contract/shared.css";
import "./SettlementArchivePreviewPage.css";

import {
  getContractAccount,
  getContractSignatures,
  getLoanContract,
  type ContractSignatures,
} from "../../contract/api/contractApi";

import type { LinkedBankAccount } from "../../accounts/types/account";

import type { LoanContractResponse } from "../../contract/types/contract";

import { downloadContractPdf } from "../pdf/downloadContractPdf";

import ContractPdfTemplate from "../pdf/ContractPdfTemplate";

const EMPTY_SIGNATURES: ContractSignatures = {
  creditorSignatureDataUri: null,

  debtorSignatureDataUri: null,
};

export default function ContractArchivePreviewPage() {
  const navigate = useNavigate();

  const { contractId } = useParams<{
    contractId: string;
  }>();

  const numericContractId = contractId !== undefined ? Number(contractId) : NaN;

  const isInvalidId = Number.isNaN(numericContractId);

  const [contract, setContract] = useState<LoanContractResponse | null>(null);

  const [account, setAccount] = useState<LinkedBankAccount | null>(null);

  const [creditorSignatureDataUri, setCreditorSignatureDataUri] = useState<
    string | null
  >(null);

  const [debtorSignatureDataUri, setDebtorSignatureDataUri] = useState<
    string | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isInvalidId) {
      return;
    }

    let cancelled = false;

    Promise.all([
      getLoanContract(numericContractId),

      getContractSignatures(numericContractId).catch((signatureError) => {
        console.error(
          "[ContractArchivePreviewPage] 서명 이미지 조회 실패",
          signatureError,
        );

        return EMPTY_SIGNATURES;
      }),

      getContractAccount(numericContractId).catch((accountError) => {
        console.error(
          "[ContractArchivePreviewPage] 수취 계좌 조회 실패",
          accountError,
        );

        return null;
      }),
    ])
      .then(([contractData, signatures, accountData]) => {
        if (cancelled) {
          return;
        }

        setContract(contractData);

        setAccount(accountData);

        setCreditorSignatureDataUri(signatures.creditorSignatureDataUri);

        setDebtorSignatureDataUri(signatures.debtorSignatureDataUri);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("차용증 내역을 불러올 수 없습니다.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [numericContractId, isInvalidId]);

  async function handleDownloadClick() {
    if (!contract || isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      await downloadContractPdf(contract.contractId);
    } catch {
      alert("차용증 PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="page preview-page">
      <div className="preview-toolbar">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate("/archive")}
        >
          목록으로
        </button>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleDownloadClick}
          disabled={isDownloading || !contract}
        >
          {isDownloading && (
            <span className="button-spinner" aria-hidden="true" />
          )}
          PDF 다운로드
        </button>
      </div>

      {isInvalidId ? (
        <div className="preview-status">
          <p>잘못된 차용증 번호입니다.</p>
        </div>
      ) : isLoading ? (
        <div className="preview-status">
          <LoadingSkeleton className="loading-skeleton--page" rows={8} />
        </div>
      ) : error || !contract ? (
        <div className="preview-status">
          <p>{error ?? "차용증 내역을 불러올 수 없습니다."}</p>
        </div>
      ) : (
        <div className="pdf-preview">
          <PDFViewer width="100%" height="100%" showToolbar>
            <ContractPdfTemplate
              contract={contract}
              account={account}
              creditorSignatureDataUri={creditorSignatureDataUri}
              debtorSignatureDataUri={debtorSignatureDataUri}
            />
          </PDFViewer>
        </div>
      )}
    </div>
  );
}
