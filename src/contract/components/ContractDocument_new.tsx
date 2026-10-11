import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Input, Select } from "../../common/components";

import type { LinkedBankAccount } from "../../accounts/types/account";

import { getSelectableAccounts } from "../api/contractApi";

import {
  REPAYMENT_METHOD_LABELS,
  type ContractFormData,
  type CreditorInfo,
  type RepaymentMethod,
} from "../types/contract";

import type {
  AppliedContractClause,
  DraftContractClause,
} from "../types/clauseAgent";

import type { ContractFieldWarning } from "../utils/contractValidation";
import { findContractWarning } from "../utils/contractValidation";

import {
  formatClauseSlotValue,
  getUnresolvedClauseSlots,
  parseClauseTemplate,
} from "../utils/clauseSlots";

import ClauseReasonDrawer from "./ClauseReasonDrawer";

import "./ContractDocument.css";
import "./ContractDocumentEnhancements.css";

interface ContractDocumentProps {
  formData: ContractFormData;

  onFieldChange: <K extends keyof ContractFormData>(
    field: K,
    value: ContractFormData[K],
  ) => void;

  creditorInfo: CreditorInfo | null;

  debtorName?: string | null;

  appliedClauses: AppliedContractClause[];

  draftClause: DraftContractClause | null;

  recentlyAppliedClauseId: string | null;

  fieldWarnings: ContractFieldWarning[];

  onOpenClauseSettings: (clauseId: string) => void;

  onRemoveClause: (clauseId: string) => void;

  disabled?: boolean;

  readOnly?: boolean;

  documentStatusText?: string;
}

interface InlineWarningData {
  title: string;
  message: string;
}

/* =========================================================
   날짜 검증
========================================================= */

function parseContractDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getOneMonthLater(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const lastDayOfTargetMonth = new Date(year, month + 2, 0).getDate();

  return new Date(year, month + 1, Math.min(day, lastDayOfTargetMonth));
}

function getLoanPeriodWarning(
  startDateValue: string,
  maturityDateValue: string,
): InlineWarningData | undefined {
  const startDate = parseContractDate(startDateValue);
  const maturityDate = parseContractDate(maturityDateValue);

  if (!startDate || !maturityDate) {
    return undefined;
  }

  if (maturityDate <= startDate) {
    return {
      title: "변제기일을 확인해 주세요",
      message: "최종 변제기일은 대여금 지급일보다 이후 날짜여야 합니다.",
    };
  }

  const oneMonthLater = getOneMonthLater(startDate);

  if (maturityDate < oneMonthLater) {
    return {
      title: "대여기간은 최소 1개월이어야 합니다",
      message:
        "현재 지급일부터 최종 변제기일까지의 기간이 1개월 미만입니다. 최종 변제기일을 지급일로부터 최소 1개월 이후로 설정해 주세요.",
    };
  }

  return undefined;
}

/* =========================================================
   공통 표시
========================================================= */

function InlineWarning({
  warning,
}: {
  warning: InlineWarningData | ContractFieldWarning | undefined;
}) {
  if (!warning) {
    return null;
  }

  return (
    <div className="document-inline-warning">
      <span>!</span>

      <div>
        <strong>{warning.title}</strong>
        <p>{warning.message}</p>
      </div>
    </div>
  );
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return <strong className="document-value">{children || "-"}</strong>;
}

/* =========================================================
   Agent Clause
========================================================= */

function RenderSmartClause({
  clause,
  onOpen,
  readOnly,
}: {
  clause: AppliedContractClause;
  onOpen: () => void;
  readOnly: boolean;
}) {
  const tokens = parseClauseTemplate(clause.templateContent);

  return (
    <p className="smart-clause-sentence">
      {tokens.map((token, index) => {
        if (token.type === "TEXT") {
          return <span key={`text-${index}`}>{token.value}</span>;
        }

        const slot = clause.slots[token.slotIndex];

        if (!slot) {
          return null;
        }

        const value = formatClauseSlotValue(slot);

        if (readOnly) {
          return (
            <strong
              key={slot.id}
              className={[
                "smart-clause-token",
                value ? "is-filled" : "is-empty",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {value || slot.label}
            </strong>
          );
        }

        return (
          <button
            type="button"
            key={slot.id}
            className={["smart-clause-token", value ? "is-filled" : "is-empty"]
              .filter(Boolean)
              .join(" ")}
            onClick={onOpen}
          >
            {value || slot.label}
          </button>
        );
      })}
    </p>
  );
}

/* =========================================================
   Scroll
========================================================= */

function findScrollableParent(element: HTMLElement | null): HTMLElement | null {
  let parent = element?.parentElement ?? null;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

/* =========================================================
   Component
========================================================= */

export default function ContractDocument({
  formData,
  onFieldChange,
  creditorInfo,
  debtorName,
  appliedClauses,
  draftClause,
  recentlyAppliedClauseId,
  fieldWarnings,
  onOpenClauseSettings,
  onRemoveClause,
  disabled = false,
  readOnly = false,
  documentStatusText,
}: ContractDocumentProps) {
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [principalFocused, setPrincipalFocused] = useState(false);
  const [reasonClause, setReasonClause] =
    useState<AppliedContractClause | null>(null);

  const draftRef = useRef<HTMLElement | null>(null);

  /* =========================================================
     계좌 조회
     - 상대방 확인/완료 조회에서는 채무자의 계좌 API를 호출하지 않는다.
  ========================================================= */

  useEffect(() => {
    if (readOnly) {
      setAccounts([]);
      setAccountError(null);
      return;
    }

    let cancelled = false;

    getSelectableAccounts()
      .then((data) => {
        if (!cancelled) {
          setAccounts(data);
          setAccountError(null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setAccounts([]);
        setAccountError(
          error instanceof Error
            ? error.message
            : "계좌 정보를 불러오지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  /* =========================================================
     Draft 자동 스크롤
  ========================================================= */

  useLayoutEffect(() => {
    if (!draftClause || readOnly) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const target = draftRef.current;

          if (!target) {
            return;
          }

          const scrollParent = findScrollableParent(target);

          if (scrollParent) {
            scrollParent.scrollTo({
              top: Math.max(0, target.offsetTop - 120),
              behavior: "smooth",
            });
            return;
          }

          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftClause?.title, draftClause?.status, readOnly]);

  const selectedAccount = accounts.find(
    (account) =>
      String(account.linkedAccountId) === formData.selectedLinkedAccountId,
  );

  const principalValue =
    !principalFocused && formData.principalAmount
      ? Number(formData.principalAmount).toLocaleString("ko-KR")
      : formData.principalAmount;

  const principalWarning = findContractWarning(
    fieldWarnings,
    "principalAmount",
  );

  const maturityWarning =
    findContractWarning(fieldWarnings, "maturityDate") ??
    getLoanPeriodWarning(formData.startDate, formData.maturityDate);

  const interestWarning = findContractWarning(fieldWarnings, "interestRate");

  const repaymentDayWarning = findContractWarning(
    fieldWarnings,
    "repaymentDay",
  );

  const resolvedStatusText =
    documentStatusText ?? (readOnly ? "계약 내용 확인" : "작성 중");

  const resolvedDebtorName = debtorName?.trim() || "상대방 확인 단계에서 확정";

  function handleRemoveClause(clause: AppliedContractClause) {
    if (readOnly) {
      return;
    }

    const confirmed = window.confirm(
      `「${clause.title}」 조항을 계약서에서 삭제할까요?`,
    );

    if (!confirmed) {
      return;
    }

    if (reasonClause?.id === clause.id) {
      setReasonClause(null);
    }

    onRemoveClause(clause.id);
  }

  return (
    <>
      <article className="contract-paper">
        {/* ===================================
            Header
        =================================== */}

        <header className="contract-paper__header">
          <div className="contract-paper__meta">
            <span>금전소비대차계약</span>
            <span>{resolvedStatusText}</span>
          </div>

          <h1>금전소비대차계약서</h1>

          <p>금전의 대여 및 반환에 관한 당사자 간 계약</p>

          <div className="contract-paper__party-line">
            <span>채권자</span>
            <strong>{creditorInfo?.name ?? "확인 중"}</strong>

            <i />

            <span>채무자</span>
            <strong>{resolvedDebtorName}</strong>
          </div>
        </header>

        {/* ===================================
            제1조
        =================================== */}

        <section
          className={["document-clause", principalWarning ? "has-error" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <h2>
            제1조
            <span>(대여 및 차용)</span>
          </h2>

          <p>
            채권자{" "}
            <strong className="document-value">
              {creditorInfo?.name ?? "-"}
            </strong>
            (이하 "갑"이라 한다)는 채무자{" "}
            {readOnly && (
              <strong className="document-value">{resolvedDebtorName}</strong>
            )}
            (이하 "을"이라 한다)에게 금
            {readOnly ? (
              <ReadOnlyValue>
                {formData.principalAmount
                  ? Number(formData.principalAmount).toLocaleString("ko-KR")
                  : "-"}
              </ReadOnlyValue>
            ) : (
              <Input
                variant="document"
                className="document-inline document-inline--money"
                type="text"
                inputMode="numeric"
                value={principalValue}
                disabled={disabled}
                onFocus={() => setPrincipalFocused(true)}
                onBlur={() => setPrincipalFocused(false)}
                onChange={(event) =>
                  onFieldChange(
                    "principalAmount",
                    event.target.value.replace(/[^\d]/g, ""),
                  )
                }
              />
            )}
            원을 대여하고, 을은 이를 차용한다.
          </p>

          <InlineWarning warning={principalWarning} />
        </section>

        {/* ===================================
            제2조
        =================================== */}

        <section
          className={["document-clause", maturityWarning ? "has-error" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <h2>
            제2조
            <span>(대여기간)</span>
          </h2>

          <p>
            본 계약에 따른 대여금의 지급일은
            {readOnly ? (
              <ReadOnlyValue>{formData.startDate || "-"}</ReadOnlyValue>
            ) : (
              <Input
                variant="document"
                className="document-inline document-inline--date"
                type="date"
                value={formData.startDate}
                disabled={disabled}
                onChange={(event) =>
                  onFieldChange("startDate", event.target.value)
                }
              />
            )}
            로 하고, 최종 변제기일은
            {readOnly ? (
              <ReadOnlyValue>{formData.maturityDate || "-"}</ReadOnlyValue>
            ) : (
              <Input
                variant="document"
                className="document-inline document-inline--date"
                type="date"
                value={formData.maturityDate}
                disabled={disabled}
                onChange={(event) =>
                  onFieldChange("maturityDate", event.target.value)
                }
              />
            )}
            로 한다.
          </p>

          <InlineWarning warning={maturityWarning} />
        </section>

        {/* ===================================
            제3조
        =================================== */}

        <section
          className={["document-clause", interestWarning ? "has-error" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <h2>
            제3조
            <span>(이자)</span>
          </h2>

          <p>
            을은 미상환 원금에 대하여 연
            {readOnly ? (
              <ReadOnlyValue>{formData.interestRate || "-"}</ReadOnlyValue>
            ) : (
              <Input
                variant="document"
                className="document-inline document-inline--rate"
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                value={formData.interestRate}
                disabled={disabled}
                onChange={(event) =>
                  onFieldChange("interestRate", event.target.value)
                }
              />
            )}
            %의 약정이율에 따른 이자를 지급한다.
          </p>

          <InlineWarning warning={interestWarning} />
        </section>

        {/* ===================================
            제4조
        =================================== */}

        <section
          className={["document-clause", repaymentDayWarning ? "has-error" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <h2>
            제4조
            <span>(원금 및 이자의 변제)</span>
          </h2>

          <p>
            을은 본 채무를
            {readOnly ? (
              <ReadOnlyValue>
                {REPAYMENT_METHOD_LABELS[formData.repaymentType] ?? "-"}
              </ReadOnlyValue>
            ) : (
              <Select
                variant="document"
                className="document-inline-select"
                value={formData.repaymentType}
                disabled={disabled}
                onChange={(event) =>
                  onFieldChange(
                    "repaymentType",
                    event.target.value as RepaymentMethod,
                  )
                }
              >
                {(
                  Object.keys(REPAYMENT_METHOD_LABELS) as RepaymentMethod[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {REPAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </Select>
            )}
            방식으로 변제하며, 정기 상환일은 매월
            {readOnly ? (
              <ReadOnlyValue>{formData.repaymentDay || "-"}</ReadOnlyValue>
            ) : (
              <Input
                variant="document"
                className="document-inline document-inline--day"
                type="number"
                min={1}
                max={31}
                value={formData.repaymentDay}
                disabled={disabled}
                onChange={(event) =>
                  onFieldChange("repaymentDay", event.target.value)
                }
              />
            )}
            일로 한다.
          </p>

          <InlineWarning warning={repaymentDayWarning} />

          <div className="document-account">
            <p>
              을은 본 계약에 따른 원금 및 이자를 갑이 지정한 계좌로 송금하여
              변제한다.
            </p>

            {!readOnly && (
              <>
                <label>변제금 수취 계좌</label>

                <Select
                  variant="document"
                  value={formData.selectedLinkedAccountId}
                  disabled={disabled}
                  onChange={(event) =>
                    onFieldChange("selectedLinkedAccountId", event.target.value)
                  }
                >
                  <option value="">변제금을 받을 계좌를 선택해 주세요</option>

                  {accounts.map((account) => (
                    <option
                      key={account.linkedAccountId}
                      value={account.linkedAccountId}
                    >
                      {account.bankName}
                      {" · "}
                      {account.accountHolderName}
                      {" · "}
                      {account.maskedAccountNumber}
                    </option>
                  ))}
                </Select>

                {selectedAccount && (
                  <div className="document-account__info">
                    <span>{selectedAccount.bankName}</span>
                    <b>{selectedAccount.maskedAccountNumber}</b>
                    <span>예금주 {selectedAccount.accountHolderName}</span>
                  </div>
                )}

                {accountError && (
                  <small className="document-error">{accountError}</small>
                )}
              </>
            )}
          </div>
        </section>

        {/* ===================================
            제5조
        =================================== */}

        <section className="document-clause">
          <h2>
            제5조
            <span>(차용 목적)</span>
          </h2>

          <p>
            을은 본 대여금을
            {readOnly ? (
              <ReadOnlyValue>{formData.contractAlias || "-"}</ReadOnlyValue>
            ) : (
              <Input
                variant="document"
                className="document-inline document-inline--purpose"
                type="text"
                placeholder="예: 생활비, 사업 운영자금"
                value={formData.contractAlias}
                disabled={disabled}
                onChange={(event) =>
                  onFieldChange("contractAlias", event.target.value)
                }
              />
            )}
            의 목적으로 사용한다.
          </p>
        </section>

        {/* ===================================
            확정된 S-AI 조항
        =================================== */}

        {appliedClauses.map((clause, index) => {
          const articleNumber = 6 + index;
          const unresolved = getUnresolvedClauseSlots(clause);

          return (
            <section
              key={clause.id}
              className={[
                "document-clause",
                "document-clause--generated",
                unresolved.length > 0 ? "has-unresolved-slots" : "",
                clause.id === recentlyAppliedClauseId ? "is-just-applied" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {!readOnly && (
                <button
                  type="button"
                  className="document-clause__remove-hover"
                  aria-label={`${clause.title} 조항 삭제`}
                  title="조항 삭제"
                  onClick={() => handleRemoveClause(clause)}
                >
                  ×
                </button>
              )}

              <div className="document-clause__generated-head">
                <h2>
                  제{articleNumber}조<span>({clause.title})</span>
                </h2>

                {!readOnly && (
                  <div className="document-clause__tools">
                    {unresolved.length > 0 && (
                      <button
                        type="button"
                        className="document-clause__complete-button"
                        onClick={() => onOpenClauseSettings(clause.id)}
                      >
                        입력 필요 {unresolved.length}
                      </button>
                    )}

                    {clause.references.length > 0 && (
                      <button
                        type="button"
                        className="document-clause__evidence-button"
                        onClick={() => setReasonClause(clause)}
                      >
                        왜 이 조항인가요?
                        <span>→</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <RenderSmartClause
                clause={clause}
                onOpen={() => onOpenClauseSettings(clause.id)}
                readOnly={readOnly}
              />

              {!readOnly && unresolved.length > 0 && (
                <div className="document-clause__slot-notice">
                  <div>
                    <strong>이 조항에 확정할 계약 조건이 있습니다.</strong>
                    <p>
                      문장을 직접 수정할 필요 없이 필요한 값만 선택하면 됩니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenClauseSettings(clause.id)}
                  >
                    조건 입력하기
                  </button>
                </div>
              )}
            </section>
          );
        })}

        {/* ===================================
            작성 중 Draft
        =================================== */}

        {!readOnly && draftClause && (
          <section
            ref={draftRef}
            className="document-clause document-clause--generated is-draft"
          >
            <div className="document-clause__generated-head">
              <h2>
                제{6 + appliedClauses.length}조
                <span>({draftClause.title})</span>
              </h2>

              <span className="document-draft-badge">
                <i />
                작성 중
              </span>
            </div>

            <p>
              {draftClause.content}
              {draftClause.status === "STREAMING" && (
                <i className="document-writing-caret" />
              )}
            </p>

            {draftClause.status === "READY" && (
              <div className="document-pending">
                <span />
                아직 계약에 반영되지 않은 검토 중인 초안입니다.
              </div>
            )}
          </section>
        )}

        {/* ===================================
            기타사항
        =================================== */}

        <section className="document-clause">
          <h2>
            제{6 + appliedClauses.length + (!readOnly && draftClause ? 1 : 0)}조
            <span>(기타사항)</span>
          </h2>

          <p>
            본 계약에서 정하지 아니한 사항은 당사자 간 합의와 관계 법령에 따라
            처리한다.
          </p>
        </section>
      </article>

      {!readOnly && (
        <ClauseReasonDrawer
          clause={reasonClause}
          onClose={() => setReasonClause(null)}
        />
      )}
    </>
  );
}
