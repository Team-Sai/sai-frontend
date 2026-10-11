import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import LoadingSkeleton from "../../common/components/LoadingSkeleton";

import ContractDocument from "../components/ContractDocument";
import PartiesInfo from "../components/PartiesInfo";

import { getContractDocument } from "../api/contractDocumentApi";

import type { ContractDocumentDetail } from "../types/contractDocument";

import type { AppliedContractClause } from "../types/clauseAgent";

import type {
  ContractFormData,
  CreditorInfo,
  RepaymentMethod,
} from "../types/contract";

import "../shared.css";
import "../styles/ContractDocumentPage.css";

/* =========================================================
   저장된 계약 -> ContractDocument용 데이터
========================================================= */

function toContractFormData(
  data: ContractDocumentDetail["contract"],
): ContractFormData {
  return {
    relationType: "ACQUAINTANCE",

    principalAmount:
      data.principalAmount != null ? String(data.principalAmount) : "",

    interestRate: data.interestRate != null ? String(data.interestRate) : "",

    repaymentType: (data.repaymentType ??
      "EQUAL_PRINCIPAL_AND_INTEREST") as RepaymentMethod,

    startDate: data.startDate ?? "",

    maturityDate: data.maturityDate ?? "",

    repaymentDay: data.repaymentDay != null ? String(data.repaymentDay) : "",

    contractAlias: data.contractAlias ?? "",

    terms: data.terms ?? "",

    /*
     * 현재 /document API에는 주소/선택계좌가 없음.
     * 상세 조회에서는 읽기 전용이라 빈 값으로 둔다.
     */
    creditorAddress: "",

    selectedLinkedAccountId: "",
  };
}

/* =========================================================
   저장된 terms -> S-AI 조항 복원
========================================================= */

/**
 * 저장 형태 예:
 *
 * [추가조항 1] 연체 위약금
 * 차주가 ...
 *
 * [추가조항 2] 중도상환
 * 차주는 ...
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

  /*
   * 예전 계약처럼
   * [추가조항 N] 형식으로 저장되지 않은 경우도
   * 통째로 하나의 특약으로 보여준다.
   */
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

      /*
       * DB에 들어갈 때는 이미
       * [입력 필요] Slot이 실제 값으로 치환된 문장이므로
       * 상세 조회에서는 Slot 메타데이터가 필요 없다.
       */
      slots: [],

      source: "AI" as const,

      createdAt: 0,

      summary: "",

      issues: [],

      /*
       * 현재 상세 API에는 AI 법령 근거까지 저장돼 있지 않으므로
       * 과거 계약에서는 근거 Drawer를 복구하지 않는다.
       */
      references: [],

      warnings: [],
    };
  });
}

/* =========================================================
   Read-only noop
========================================================= */

function noopFieldChange<K extends keyof ContractFormData>(
  _field: K,
  _value: ContractFormData[K],
) {
  // 상세 조회는 읽기 전용
}

function noopClauseAction(_clauseId: string) {
  // 상세 조회에서는 조항 수정/삭제 없음
}

/* =========================================================
   Page
========================================================= */

export default function ContractDocumentPage() {
  const { contractId } = useParams<{
    contractId: string;
  }>();

  if (!contractId) {
    return (
      <div className="contract-scope contract-scope--document contract-document-page">
        <div className="contract-document-empty">잘못된 접근입니다.</div>
      </div>
    );
  }

  return <ContractDocumentContent key={contractId} contractId={contractId} />;
}

/* =========================================================
   Content
========================================================= */

function ContractDocumentContent({ contractId }: { contractId: string }) {
  const navigate = useNavigate();

  const [data, setData] = useState<ContractDocumentDetail | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);

    setError(null);

    getContractDocument(Number(contractId))
      .then((response) => {
        if (cancelled) {
          return;
        }

        setData(response);
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return;
        }

        setData(null);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "계약서 정보를 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  /* =========================================================
     Loading
  ========================================================= */

  if (isLoading) {
    return (
      <div className="contract-scope contract-scope--document contract-document-page">
        <LoadingSkeleton className="loading-skeleton--page" rows={8} />
      </div>
    );
  }

  /* =========================================================
     Error
  ========================================================= */

  if (error || !data) {
    return (
      <div className="contract-scope contract-scope--document contract-document-page">
        <div className="contract-document-empty">
          {error ?? "데이터가 없습니다."}
        </div>
      </div>
    );
  }

  const { contract, canRequestChange } = data;

  /* =========================================================
     기존 ContractDocument 재사용을 위한 변환
  ========================================================= */

  const formData = toContractFormData(contract);

  const creditorInfo: CreditorInfo = {
    name: contract.creditorName ?? "-",

    /*
     * 현재 document API에는 생년월일이 없음.
     */
    birthDate: "-",
  };

  const debtorInfo = {
    name: contract.debtorName ?? "-",

    birthDate: "-",
  };

  const appliedClauses = parseStoredTerms(contract.terms, contractId);

  const documentStatusText =
    contract.status === "COMPLETED"
      ? "체결 완료"
      : contract.status === "PENDING"
        ? "서명 대기"
        : contract.status === "DRAFT"
          ? "작성 중"
          : "계약 상세";

  return (
    <div className="contract-scope contract-scope--document contract-document-page">
      {/* =====================================================
          상세 페이지 Header
      ===================================================== */}

      <header className="contract-document-heading">
        <div className="contract-document-heading__copy">
          <span className="contract-document-heading__eyebrow">
            CONTRACT DETAIL
          </span>

          <h1>계약서 상세</h1>

          <p>저장된 계약 조건과 추가 조항을 확인할 수 있습니다.</p>
        </div>

        {canRequestChange && (
          <button
            type="button"
            className="contract-document-action"
            onClick={() => navigate(`/contracts/${contractId}/change-request`)}
          >
            계약 변경 요청
          </button>
        )}
      </header>

      {/* =====================================================
          하나의 계약서 Sheet

          ContractDocument + PartiesInfo를
          같은 흰색 종이 안에 넣는다.
      ===================================================== */}

      <section className="contract-document-sheet" aria-label="계약서 내용">
        <div className="contract-document-sheet__body">
          <ContractDocument
            formData={formData}
            onFieldChange={noopFieldChange}
            creditorInfo={creditorInfo}
            debtorName={contract.debtorName}
            appliedClauses={appliedClauses}
            draftClause={null}
            recentlyAppliedClauseId={null}
            fieldWarnings={[]}
            onOpenClauseSettings={noopClauseAction}
            onRemoveClause={noopClauseAction}
            disabled
            readOnly
            documentStatusText={documentStatusText}
          />
        </div>

        {/* ===================================================
            계약서 하단 당사자 정보
        =================================================== */}

        <div className="contract-document-sheet__parties">
          <PartiesInfo
            creditorInfo={creditorInfo}
            creditorAddress=""
            onCreditorAddressChange={() => undefined}
            debtorInfo={debtorInfo}
            debtorAddress=""
            mode="READ_ONLY"
            disabled
          />
        </div>
      </section>

      {/* =====================================================
          계약서 바깥의 상세페이지 안내
      ===================================================== */}

      {!canRequestChange && (
        <p className="contract-document-notice" role="status">
          현재 진행 중인 요청이 있어 새 계약 변경 요청을 할 수 없습니다.
        </p>
      )}

      <p className="contract-document-disclaimer">
        * 본 계약서는 당사자 간 입력 정보 및 전자적 기반으로 작성·보관되는
        문서로, 서명 및 본인확인 절차의 방식에 따라 그 법적 효력의 범위나 효력
        발생 요건에 관한 해석이 달라질 수 있어 구체적인 법적 효력 여부는 별도
        확인이 필요할 수 있습니다.
      </p>
    </div>
  );
}
