import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../shared.css";
import "../styles/ContractFormPage.css";
import "../components/PartiesInfo.css";

import Stepper from "../components/Stepper";
import ContractDocument from "../components/ContractDocument";
import PartiesInfo from "../components/PartiesInfo";

import { getContractDetail, linkAsDebtor } from "../api/contractApi";

import {
  CONTRACT_STATUS_LABELS,
  DEBTOR_APPROVAL_DRAFT_KEY,
  type ContractDetail,
  type ContractFormData,
  type CreditorInfo,
} from "../types/contract";

import type { AppliedContractClause } from "../types/clauseAgent";

import {
  clearIdentityVerification,
  isIdentityVerifiedFor,
} from "../../identity/identityVerificationStorage";

interface HttpError extends Error {
  status?: number;
}

function toContractFormData(detail: ContractDetail): ContractFormData {
  return {
    relationType: "ACQUAINTANCE",
    principalAmount:
      detail.principalAmount != null ? String(detail.principalAmount) : "",
    interestRate:
      detail.interestRate != null ? String(detail.interestRate) : "",
    repaymentType:
      detail.repaymentType ?? "EQUAL_PRINCIPAL_AND_INTEREST",
    startDate: detail.startDate ?? "",
    maturityDate: detail.maturityDate ?? "",
    repaymentDay:
      detail.repaymentDay != null ? String(detail.repaymentDay) : "",
    contractAlias: detail.contractAlias ?? "",
    terms: detail.terms ?? "",
    creditorAddress: detail.creditorAddress ?? "",
    selectedLinkedAccountId: "",
  };
}

/**
 * ContractFormPage에서 저장한 형식:
 *
 * [추가조항 1] 연체 위약금
 * 조항 본문...
 *
 * [추가조항 2] ...
 * ...
 *
 * 을 다시 기존 AppliedContractClause[] 형태로 복원한다.
 * 상대방 확인 단계에서는 이미 입력 Slot이 실제 값으로 치환되어 저장되어 있으므로
 * slots/references 등의 작성용 메타데이터는 필요하지 않다.
 */
function parseStoredTerms(
  terms: string | null,
  contractId: string,
): AppliedContractClause[] {
  const source = terms?.trim();

  if (!source) {
    return [];
  }

  const headerPattern = /^\[추가조항\s+(\d+)\]\s*(.*)$/gm;
  const matches = Array.from(source.matchAll(headerPattern));

  if (matches.length === 0) {
    return [
      {
        id: `stored-${contractId}-1`,
        title: "특약사항",
        templateContent: source,
        slots: [],
        source: "AI",
        createdAt: 0,
        summary: "",
        issues: [],
        references: [],
        warnings: [],
      },
    ];
  }

  return matches.map((match, index) => {
    const clauseNumber = match[1] || String(index + 1);
    const title = match[2]?.trim() || `추가 조항 ${clauseNumber}`;

    const headerStart = match.index ?? 0;
    const contentStart = headerStart + match[0].length;
    const nextHeaderStart =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? source.length)
        : source.length;

    const content = source.slice(contentStart, nextHeaderStart).trim();

    return {
      id: `stored-${contractId}-${clauseNumber}`,
      title,
      templateContent: content,
      slots: [],
      source: "AI" as const,
      createdAt: 0,
      summary: "",
      issues: [],
      references: [],
      warnings: [],
    };
  });
}

function noopFieldChange<K extends keyof ContractFormData>(
  _field: K,
  _value: ContractFormData[K],
) {
  // 상대방 확인 화면은 읽기 전용 계약서이므로 아무 것도 하지 않는다.
}

function noopClauseAction(_clauseId: string) {
  // 상대방 확인 화면에서는 조항 편집/삭제 기능을 제공하지 않는다.
}

export default function DebtorContractFormPage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const debtorAddressInputRef = useRef<HTMLInputElement>(null);

  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [debtorAddress, setDebtorAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [needsLinkConfirm, setNeedsLinkConfirm] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (!contractId) {
      return;
    }

    let cancelled = false;

    function requireIdentityVerification() {
      if (isIdentityVerifiedFor(`/contracts/${contractId}/approve`)) {
        return false;
      }

      clearIdentityVerification();

      navigate(
        `/identity-test?returnTo=${encodeURIComponent(
          `/contracts/${contractId}/approve`,
        )}`,
        { replace: true },
      );

      return true;
    }

    async function loadContract() {
      try {
        const data = await getContractDetail(Number(contractId));

        if (cancelled) {
          return;
        }

        if (data.status !== "COMPLETED" && requireIdentityVerification()) {
          return;
        }

        setNeedsLinkConfirm(false);
        setDetail(data);
        setDebtorAddress(data.debtorAddress ?? "");

        if (data.status === "COMPLETED") {
          setLockMessage("이미 작성 완료된 차용증입니다.");
        } else if (data.status === "DRAFT") {
          setLockMessage(
            "채권자가 아직 계약서를 전송하지 않았습니다. 전송 후 다시 확인해 주세요.",
          );
        } else {
          setLockMessage(null);
        }

        setIsLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const status = (error as HttpError).status;

        if (status === 403) {
          if (requireIdentityVerification()) {
            return;
          }

          setNeedsLinkConfirm(true);
          setIsLoading(false);
          return;
        }

        setIsError(true);
        setStatusMessage("계약서를 불러오지 못했습니다.");
        setLockMessage("");
        setIsLoading(false);
      }
    }

    void loadContract();

    return () => {
      cancelled = true;
    };
  }, [contractId, navigate]);

  async function handleConfirmLink() {
    if (!contractId || isLinking) {
      return;
    }

    setIsLinking(true);
    setIsError(false);
    setStatusMessage(null);

    try {
      await linkAsDebtor(Number(contractId));

      setIsLoading(true);

      const data = await getContractDetail(Number(contractId));

      setNeedsLinkConfirm(false);
      setDetail(data);
      setDebtorAddress(data.debtorAddress ?? "");

      setLockMessage(
        data.status === "COMPLETED"
          ? "이미 작성 완료된 차용증입니다."
          : data.status === "DRAFT"
            ? "채권자가 아직 계약서를 전송하지 않았습니다. 전송 후 다시 확인해 주세요."
            : null,
      );
    } catch (error) {
      setIsError(true);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "계약서에 채무자로 연결하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
      setIsLinking(false);
    }
  }

  function handleNext() {
    if (!debtorAddress.trim()) {
      setIsError(true);
      setStatusMessage("본인 주소를 입력해 주세요.");
      debtorAddressInputRef.current?.focus();
      return;
    }

    try {
      sessionStorage.setItem(
        DEBTOR_APPROVAL_DRAFT_KEY,
        JSON.stringify({ debtorAddress }),
      );
    } catch {
      setIsError(true);
      setStatusMessage(
        "입력 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    navigate(`/contracts/${contractId}/approve/signature`);
  }

  const locked = lockMessage !== null && lockMessage !== "";

  const bannerText = detail
    ? `현재 상태: ${CONTRACT_STATUS_LABELS[detail.status]}`
    : null;

  const formData = useMemo(
    () => (detail ? toContractFormData(detail) : null),
    [detail],
  );

  const creditorInfo = useMemo<CreditorInfo | null>(
    () =>
      detail
        ? {
            name: detail.creditorName ?? "-",
            birthDate: detail.creditorBirthDate ?? "-",
          }
        : null,
    [detail],
  );

  const debtorInfo = useMemo(
    () =>
      detail
        ? {
            name: detail.debtorName ?? "-",
            birthDate: detail.debtorBirthDate ?? "-",
          }
        : null,
    [detail],
  );

  const appliedClauses = useMemo(
    () => parseStoredTerms(detail?.terms ?? null, contractId ?? "unknown"),
    [detail?.terms, contractId],
  );

  if (needsLinkConfirm) {
    return (
      <div className="page">
        <Stepper currentStep={3} />

        <div className="doc" id="approveForm">
          <h1 className="doc__title">금 전 차 용 계 약 서</h1>

          <p className="doc__hint">
            본인이 이 계약서의 채무자가 맞는 경우에만 아래 버튼을 눌러
            계약과 연결해 주세요. 채무자로 연결하면 계약 내용 확인 및
            전자서명 절차가 시작됩니다.
          </p>

          <div className="doc__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={isLinking}
              onClick={handleConfirmLink}
            >
              {isLinking
                ? "연결하는 중..."
                : "본인이 채무자입니다 - 연결하기"}
            </button>
          </div>

          <p
            className={`doc__status ${isError ? "is-error" : ""}`.trim()}
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Stepper currentStep={3} />

      {bannerText && <p className="doc__status-banner">{bannerText}</p>}

      {isLoading && !detail && (
        <p className="doc__status" role="status">
          계약서를 불러오는 중입니다.
        </p>
      )}

      {formData && detail && (
        <main className="contract-workspace__main" id="approveForm">
          <ContractDocument
            formData={formData}
            onFieldChange={noopFieldChange}
            creditorInfo={creditorInfo}
            debtorName={detail.debtorName}
            appliedClauses={appliedClauses}
            draftClause={null}
            recentlyAppliedClauseId={null}
            fieldWarnings={[]}
            onOpenClauseSettings={noopClauseAction}
            onRemoveClause={noopClauseAction}
            disabled
            readOnly
            documentStatusText={
              detail.status === "COMPLETED" ? "체결 완료" : "상대방 확인"
            }
          />

          <div className="contract-paper-footer">
            <PartiesInfo
              creditorInfo={creditorInfo}
              creditorAddress={detail.creditorAddress ?? ""}
              onCreditorAddressChange={() => undefined}
              debtorInfo={debtorInfo}
              debtorAddress={debtorAddress}
              onDebtorAddressChange={(value) => {
                setDebtorAddress(value);
                setIsError(false);
                setStatusMessage(null);
              }}
              debtorAddressInputRef={debtorAddressInputRef}
              mode="DEBTOR_APPROVAL"
              disabled={isLoading || locked}
            />

            <p className="doc__disclaimer">
              본 서비스가 제공하는 차용증 양식은 일반적인 금전소비대차 계약서
              작성 편의를 위한 참고용 문서입니다. 서비스 제공자는 이용자가
              입력한 데이터의 정확성 및 개별 계약 조건에 따른 법적 분쟁에 대해
              책임을 지지 않습니다. 구체적인 법적 조언이나 강제집행력이 필요한
              경우 법률 전문가의 상담 또는 공증 절차를 진행하시길 권장합니다.
            </p>

            {!locked && (
              <div className="doc__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={isLoading}
                  onClick={handleNext}
                >
                  {isLoading && (
                    <span className="button-spinner" aria-hidden="true" />
                  )}
                  확인
                </button>
              </div>
            )}

            <p
              className={`doc__status ${isError ? "is-error" : ""}`.trim()}
              role="status"
              aria-live="polite"
            >
              {lockMessage || statusMessage}
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
