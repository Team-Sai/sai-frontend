import { useEffect, useMemo, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { authFetch } from "../../auth/authFetch";

import { getPreviousPrincipalSum } from "../api/contractApi";

import Stepper from "../components/Stepper";

import ContractDocument from "../components/ContractDocument";

import PartiesInfo from "../components/PartiesInfo";

import ContractActions from "../components/ContractActions";

import RiskModal from "../components/RiskModal";

import ClauseAgentPanel from "../components/ClauseAgentPanel";

import ClauseSlotDialog from "../components/ClauseSlotDialog";

import {
  LOAN_CONTRACT_DRAFT_KEY,
  toDraft,
  type ContractFormData,
  type CreditorInfo,
} from "../types/contract";

import type {
  AppliedContractClause,
  ClauseSlot,
  ClauseSuggestionResponse,
  DraftContractClause,
} from "../types/clauseAgent";

import type { ContractFieldWarning } from "../utils/contractValidation";

import {
  countUnresolvedClauseSlots,
  createClauseSlots,
  renderClauseContent,
  repairAppliedClauseSlots,
} from "../utils/clauseSlots";

import "../shared.css";
import "../styles/ContractFormPage.css";

/* =========================================================
   Storage
========================================================= */

const LOAN_CONTRACT_EDITOR_KEY = "sai.loanContract.editor";

interface StoredEditorState {
  formData: ContractFormData;

  appliedClauses: AppliedContractClause[];
}

/* =========================================================
   Initial data
========================================================= */

function createInitialFormData(relation: string | null): ContractFormData {
  return {
    relationType: relation === "FAMILY" ? "FAMILY" : "ACQUAINTANCE",

    principalAmount: "",

    startDate: "",

    maturityDate: "",

    interestRate: "0.5",

    repaymentDay: "1",

    repaymentType: "EQUAL_PRINCIPAL_AND_INTEREST",

    contractAlias: "",

    terms: "",

    creditorAddress: "",

    selectedLinkedAccountId: "",
  };
}

/* =========================================================
   Editor restore
========================================================= */

function loadEditorState(relation: string | null): StoredEditorState {
  try {
    const raw = sessionStorage.getItem(LOAN_CONTRACT_EDITOR_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredEditorState>;

      if (parsed.formData) {
        return {
          formData: {
            ...createInitialFormData(relation),

            ...parsed.formData,

            /*
             * URL relation을 우선.
             */
            relationType:
              relation === "FAMILY"
                ? "FAMILY"
                : relation === "ACQUAINTANCE"
                  ? "ACQUAINTANCE"
                  : (parsed.formData.relationType ?? "ACQUAINTANCE"),
          },

          appliedClauses: Array.isArray(parsed.appliedClauses)
            ? repairAppliedClauseSlots(parsed.appliedClauses)
            : [],
        };
      }
    }
  } catch (error) {
    console.warn("[ContractFormPage] editor state 복원 실패", error);

    sessionStorage.removeItem(LOAN_CONTRACT_EDITOR_KEY);
  }

  return {
    formData: createInitialFormData(relation),

    appliedClauses: [],
  };
}

/* =========================================================
   Validation
========================================================= */

function createFieldWarnings(
  formData: ContractFormData,
): ContractFieldWarning[] {
  const warnings: ContractFieldWarning[] = [];

  const principal = Number(formData.principalAmount);

  if (
    formData.principalAmount &&
    (!Number.isFinite(principal) || principal <= 0)
  ) {
    warnings.push({
      field: "principalAmount",

      title: "대여금액을 확인해 주세요.",

      message: "대여 원금은 1원 이상이어야 합니다.",
    } as ContractFieldWarning);
  }

  if (formData.startDate && formData.maturityDate) {
    const start = new Date(formData.startDate);

    const maturity = new Date(formData.maturityDate);

    if (maturity <= start) {
      warnings.push({
        field: "maturityDate",

        title: "만기일을 확인해 주세요.",

        message: "최종 변제기일은 대여 시작일 이후여야 합니다.",
      } as ContractFieldWarning);
    }
  }

  if (formData.interestRate) {
    const rate = Number(formData.interestRate);

    if (
      !Number.isFinite(rate) ||
      rate < 0.5 ||
      rate > 20 ||
      !Number.isInteger(rate * 2)
    ) {
      warnings.push({
        field: "interestRate",

        title: "약정이율을 확인해 주세요.",

        message: "연이자율은 0.5% 이상 20% 이하이며 0.5% 단위로 입력해 주세요.",
      } as ContractFieldWarning);
    }
  }

  if (formData.repaymentDay) {
    const day = Number(formData.repaymentDay);

    if (!Number.isInteger(day) || day < 1 || day > 31) {
      warnings.push({
        field: "repaymentDay",

        title: "정기 상환일을 확인해 주세요.",

        message: "정기 상환일은 1일부터 31일까지 입력할 수 있습니다.",
      } as ContractFieldWarning);
    }
  }

  return warnings;
}

function validateForNext(
  formData: ContractFormData,

  appliedClauses: AppliedContractClause[],

  draftClause: DraftContractClause | null,
): string | null {
  if (draftClause) {
    return "S-AI가 작성한 조항을 적용하거나 취소한 뒤 다음 단계로 진행해 주세요.";
  }

  const unresolvedCount = countUnresolvedClauseSlots(appliedClauses);

  if (unresolvedCount > 0) {
    return `추가 조항에 아직 입력하지 않은 계약 조건이 ${unresolvedCount}개 있습니다.`;
  }

  if (!formData.selectedLinkedAccountId) {
    return "변제금을 받을 계좌를 선택해 주세요.";
  }

  if (!formData.principalAmount || Number(formData.principalAmount) <= 0) {
    return "대여 원금을 입력해 주세요.";
  }

  const rate = Number(formData.interestRate);

  if (
    !formData.interestRate ||
    !Number.isFinite(rate) ||
    rate < 0.5 ||
    rate > 20 ||
    !Number.isInteger(rate * 2)
  ) {
    return "연이자율은 0.5% 이상 20% 이하이며 0.5% 단위여야 합니다.";
  }

  if (!formData.startDate || !formData.maturityDate) {
    return "대여 시작일과 최종 변제기일을 입력해 주세요.";
  }

  if (!(new Date(formData.maturityDate) > new Date(formData.startDate))) {
    return "최종 변제기일은 대여 시작일 이후여야 합니다.";
  }

  const day = Number(formData.repaymentDay);

  if (
    formData.repaymentDay.trim() === "" ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return "정기 상환일은 1일부터 31일까지의 정수로 입력해 주세요.";
  }

  if (!formData.creditorAddress.trim()) {
    return "채권자 주소를 입력해 주세요.";
  }

  if (!formData.contractAlias.trim()) {
    return "차용 목적을 입력해 주세요.";
  }

  return null;
}

/* =========================================================
   Applied clauses → terms
========================================================= */

function serializeAppliedClauses(clauses: AppliedContractClause[]): string {
  return clauses
    .map((clause, index) => {
      const content = renderClauseContent(clause).trim();

      return [`[추가조항 ${index + 1}] ${clause.title}`, content].join("\n");
    })
    .join("\n\n");
}

/* =========================================================
   Main
========================================================= */

export default function ContractFormPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const relation = searchParams.get("relation");

  const [initialEditorState] = useState(() => loadEditorState(relation));

  const [formData, setFormData] = useState<ContractFormData>(
    initialEditorState.formData,
  );

  const [appliedClauses, setAppliedClauses] = useState<AppliedContractClause[]>(
    initialEditorState.appliedClauses,
  );

  const [draftClause, setDraftClause] = useState<DraftContractClause | null>(
    null,
  );

  const [recentlyAppliedClauseId, setRecentlyAppliedClauseId] = useState<
    string | null
  >(null);

  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);

  const [creditorInfo, setCreditorInfo] = useState<CreditorInfo | null>(null);

  const [isChecking, setIsChecking] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isError, setIsError] = useState(false);

  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);

  const [previousAmount, setPreviousAmount] = useState(0);

  const [entryPath] = useState(
    () => window.location.pathname + window.location.search,
  );

  /* =========================================================
     Derived
  ========================================================= */

  const fieldWarnings = useMemo(
    () => createFieldWarnings(formData),
    [formData],
  );

  const serializedTerms = useMemo(
    () => serializeAppliedClauses(appliedClauses),
    [appliedClauses],
  );

  const editingClause = useMemo(
    () =>
      editingClauseId
        ? (appliedClauses.find((clause) => clause.id === editingClauseId) ??
          null)
        : null,
    [editingClauseId, appliedClauses],
  );

  /* =========================================================
     Identity guard
  ========================================================= */

  useEffect(() => {
    if (sessionStorage.getItem("identityVerificationId")) {
      return;
    }

    navigate(`/identity-test?returnTo=${encodeURIComponent(entryPath)}`, {
      replace: true,
    });
  }, [navigate, entryPath]);

  /* =========================================================
     Creditor
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadCreditorInfo() {
      try {
        const response = await authFetch("/api/users/me", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return;
        }

        const user = await response.json();

        if (cancelled) {
          return;
        }

        setCreditorInfo({
          name: user.name,

          birthDate: user.birthDate,
        });
      } catch (error) {
        console.warn("[ContractFormPage] 채권자 정보 조회 실패", error);
      }
    }

    void loadCreditorInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     Editor auto save
  ========================================================= */

  useEffect(() => {
    const state: StoredEditorState = {
      formData,

      appliedClauses,
    };

    sessionStorage.setItem(LOAN_CONTRACT_EDITOR_KEY, JSON.stringify(state));
  }, [formData, appliedClauses]);

  /* =========================================================
     Field
  ========================================================= */

  function handleFieldChange<K extends keyof ContractFormData>(
    field: K,

    value: ContractFormData[K],
  ) {
    setFormData((previous) => ({
      ...previous,

      [field]: value,
    }));

    if (isError) {
      setIsError(false);

      setStatusMessage(null);
    }
  }

  /* =========================================================
     S-AI draft
  ========================================================= */

  function handleDraftChange(clause: DraftContractClause | null) {
    setDraftClause(clause);
  }

  /* =========================================================
     Apply S-AI clause
  ========================================================= */

  function handleApproveClause(response: ClauseSuggestionResponse) {
    if (!response.suggestedClause) {
      return;
    }

    const slots = createClauseSlots(response.suggestedClause);

    const createdClause: AppliedContractClause = {
      id: `ai-clause-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

      title: response.title,

      templateContent: response.suggestedClause,

      slots,

      source: "AI",

      createdAt: Date.now(),

      summary: response.summary,

      issues: Array.isArray(response.issues) ? response.issues : [],

      references: Array.isArray(response.references) ? response.references : [],

      warnings: Array.isArray(response.warnings) ? response.warnings : [],

      /*
       * 같은 사용자 요청을 다시 입력하면
       * ClauseAgentPanel에서 API 호출 전 차단 가능.
       */
      sourceRequest: response.message,
    };

    setAppliedClauses((previous) => [...previous, createdClause]);

    setDraftClause(null);

    setRecentlyAppliedClauseId(createdClause.id);

    window.setTimeout(() => {
      setRecentlyAppliedClauseId((current) =>
        current === createdClause.id ? null : current,
      );
    }, 1800);

    /*
     * 입력해야 할 Slot이 존재하면
     * 적용 직후 조건 입력창을 연다.
     */
    if (slots.length > 0) {
      window.setTimeout(() => {
        setEditingClauseId(createdClause.id);
      }, 450);
    }
  }

  /* =========================================================
     Remove clause
  ========================================================= */

  function handleRemoveClause(clauseId: string) {
    setAppliedClauses((previous) =>
      previous.filter((clause) => clause.id !== clauseId),
    );

    if (editingClauseId === clauseId) {
      setEditingClauseId(null);
    }

    if (recentlyAppliedClauseId === clauseId) {
      setRecentlyAppliedClauseId(null);
    }

    /*
     * Draft는 별개의 미확정 조항이므로
     * 기존 확정 조항 삭제 시 건드리지 않는다.
     *
     * appliedClauses 변경으로 인해
     * 자동 저장 useEffect가 sessionStorage도 갱신한다.
     */
  }

  /* =========================================================
     Slot save
  ========================================================= */

  function handleSaveClauseSlots(
    clauseId: string,

    slots: ClauseSlot[],
  ) {
    setAppliedClauses((previous) =>
      previous.map((clause) =>
        clause.id === clauseId
          ? {
              ...clause,

              slots,
            }
          : clause,
      ),
    );

    setEditingClauseId(null);
  }

  /* =========================================================
     Signature
  ========================================================= */

  function proceedToSignature() {
    const finalFormData: ContractFormData = {
      ...formData,

      /*
       * 최종 계약으로 넘어갈 때는
       * S-AI 조항의 Slot이 모두 확정된
       * 완성 문자열을 terms에 저장.
       */
      terms: serializedTerms,
    };

    /*
     * Editor state도 마지막 상태로 갱신.
     */
    sessionStorage.setItem(
      LOAN_CONTRACT_EDITOR_KEY,
      JSON.stringify({
        formData: finalFormData,

        appliedClauses,
      }),
    );

    sessionStorage.setItem(
      LOAN_CONTRACT_DRAFT_KEY,
      JSON.stringify(toDraft(finalFormData)),
    );

    navigate("/contracts/signature");
  }

  /* =========================================================
     Next
  ========================================================= */

  async function handleNext() {
    const validationError = validateForNext(
      formData,
      appliedClauses,
      draftClause,
    );

    if (validationError) {
      setIsError(true);

      setStatusMessage(validationError);

      return;
    }

    if (fieldWarnings.length > 0) {
      setIsError(true);

      setStatusMessage(
        fieldWarnings[0]?.message ?? "계약 내용을 다시 확인해 주세요.",
      );

      return;
    }

    if (formData.relationType !== "FAMILY") {
      proceedToSignature();

      return;
    }

    setIsChecking(true);

    setIsError(false);

    setStatusMessage("이전 차용금 내역을 확인하는 중입니다...");

    try {
      const sum = await getPreviousPrincipalSum();

      setPreviousAmount(sum);

      setStatusMessage(null);

      setIsRiskModalOpen(true);
    } catch (error) {
      setIsError(true);

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "이전 차용금 내역을 불러오지 못했습니다. 네트워크 상태를 확인 후 다시 시도해 주세요.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  /* =========================================================
     Render
  ========================================================= */

  return (
    <div className="page contract-form-page">
      <div className="contract-form-stage">
        <Stepper currentStep={2} />
      </div>

      {statusMessage && (
        <div
          className={["contract-page-alert", isError ? "is-error" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {statusMessage}
        </div>
      )}

      <div className="contract-workspace">
        {/* =====================================
            LEFT
        ===================================== */}

        <main className="contract-workspace__main">
          <ContractDocument
            formData={formData}
            onFieldChange={handleFieldChange}
            creditorInfo={creditorInfo}
            appliedClauses={appliedClauses}
            draftClause={draftClause}
            recentlyAppliedClauseId={recentlyAppliedClauseId}
            fieldWarnings={fieldWarnings}
            onOpenClauseSettings={setEditingClauseId}
            onRemoveClause={handleRemoveClause}
            disabled={isChecking}
          />

          <div className="contract-paper-footer">
            <PartiesInfo
              creditorInfo={creditorInfo}
              creditorAddress={formData.creditorAddress}
              onCreditorAddressChange={(value) =>
                handleFieldChange("creditorAddress", value)
              }
              disabled={isChecking}
            />

            <ContractActions
              isProcessing={isChecking}
              statusMessage={null}
              isError={false}
              onNext={handleNext}
            />
          </div>
        </main>

        {/* =====================================
            RIGHT - S-AI
        ===================================== */}

        <aside className="contract-workspace__agent">
          <div className="contract-workspace__agent-sticky">
            <ClauseAgentPanel
              formData={{
                ...formData,

                /*
                 * Agent가 현재 적용되어 있는
                 * 추가조항까지 같이 볼 수 있도록 넘김.
                 */
                terms: serializedTerms,
              }}
              fieldWarnings={fieldWarnings}
              appliedClauses={appliedClauses}
              disabled={isChecking}
              onDraftChange={handleDraftChange}
              onApprove={handleApproveClause}
            />
          </div>
        </aside>
      </div>

      {/* =====================================
          Clause Slot Dialog
      ===================================== */}

      {editingClause && (
        <ClauseSlotDialog
          clause={editingClause}
          onClose={() => setEditingClauseId(null)}
          onSave={handleSaveClauseSlots}
        />
      )}

      {/* =====================================
          Family Risk
      ===================================== */}

      {isRiskModalOpen && (
        <RiskModal
          previousAmount={previousAmount}
          currentAmount={Number(formData.principalAmount) || 0}
          interestRate={Number(formData.interestRate) || 0}
          onClose={() => setIsRiskModalOpen(false)}
          onApplySafeRate={(rate) =>
            handleFieldChange("interestRate", String(rate))
          }
          onProceed={() => {
            setIsRiskModalOpen(false);

            proceedToSignature();
          }}
        />
      )}
    </div>
  );
}
