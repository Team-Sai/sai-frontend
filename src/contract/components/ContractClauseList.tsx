
import { useState } from "react";
import type {
  AppliedContractClause,
  DraftContractClause,
} from "../types/clauseAgent";
import type { ContractFormData } from "../types/contract";
import LawReferenceModal, { type LawReferenceItem } from "./LawReferenceModal";

interface ContractClauseListProps {
  formData: ContractFormData;
  appliedClauses: AppliedContractClause[];
  draftClause: DraftContractClause | null;
  recentlyAppliedClauseId: string | null;
}

interface RenderClause {
  id: string;
  title: string;
  content: string;
  source: "BASE" | "AI" | "DRAFT";
  summary?: string;
  warnings?: string[];
  references?: LawReferenceItem[];
}

export default function ContractClauseList({
  formData,
  appliedClauses,
  draftClause,
  recentlyAppliedClauseId,
}: ContractClauseListProps) {
  const [selectedEvidenceClause, setSelectedEvidenceClause] =
    useState<RenderClause | null>(null);

  const repaymentLabel =
    formData.repaymentType === "EQUAL_PRINCIPAL_AND_INTEREST"
      ? "원리금균등상환"
      : formData.repaymentType === "EQUAL_PRINCIPAL"
        ? "원금균등상환"
        : "만기일시상환";

  const baseClausesBeforeAi: RenderClause[] = [
    {
      id: "base-purpose",
      title: "목적",
      source: "BASE",
      content:
        "채권자는 채무자에게 위 계약조건에 따라 금전을 대여하고, 채무자는 이를 차용한다.",
    },
    {
      id: "base-payment",
      title: "대여금의 지급",
      source: "BASE",
      content:
        "채권자는 본 계약에서 정한 채무자의 지급계좌로 대여금을 송금하는 방식으로 대여금을 지급한다. 당사자는 계좌이체내역 등 지급사실을 확인할 수 있는 자료를 보관한다.",
    },
    {
      id: "base-interest",
      title: "이자",
      source: "BASE",
      content: `채무자는 미상환 원금에 대하여 연 ${formData.interestRate || "-"}%의 약정이율에 따른 이자를 지급한다.`,
    },
    {
      id: "base-repayment",
      title: "원금 및 이자의 변제",
      source: "BASE",
      content: `채무자는 ${repaymentLabel} 방식에 따라 채무를 변제하며, 정기 상환일은 매월 ${
        formData.repaymentDay || "-"
      }일로 한다. 최종 변제기일까지 남은 채무를 모두 이행한다.`,
    },
    {
      id: "base-purpose-use",
      title: "차용 목적",
      source: "BASE",
      content: `채무자는 본 대여금을 ${
        formData.contractAlias || "당사자가 정한 목적"
      }의 용도로 사용한다.`,
    },
  ];

  const dynamicClauses: RenderClause[] = appliedClauses.map((clause) => {
    const raw = clause as unknown as {
      id: string;
      title: string;
      content: string;
      summary?: string;
      warnings?: string[];
      references?: LawReferenceItem[];
    };

    return {
      id: raw.id,
      title: raw.title,
      content: raw.content,
      source: "AI",
      summary: raw.summary,
      warnings: raw.warnings ?? [],
      references: raw.references ?? [],
    };
  });

  if (draftClause) {
    const rawDraft = draftClause as unknown as {
      title: string;
      content: string;
      status?: "STREAMING" | "READY";
      summary?: string;
      warnings?: string[];
      references?: LawReferenceItem[];
    };

    dynamicClauses.push({
      id: "ai-draft",
      title: rawDraft.title,
      content: rawDraft.content,
      source: "DRAFT",
      summary: rawDraft.summary,
      warnings: rawDraft.warnings ?? [],
      references: rawDraft.references ?? [],
    });
  }

  const endingClause: RenderClause = {
    id: "base-etc",
    title: "기타 사항",
    source: "BASE",
    content:
      "본 계약에서 정하지 아니한 사항은 당사자 간 합의와 관계 법령에 따라 처리한다.",
  };

  const clauses = [...baseClausesBeforeAi, ...dynamicClauses, endingClause];

  return (
    <>
      <section className="contract-clause-list">
        {clauses.map((clause, index) => {
          const articleNumber = index + 1;
          const isDraft = clause.source === "DRAFT";
          const isAi = clause.source === "AI";
          const isRecentlyApplied = clause.id === recentlyAppliedClauseId;
          const referenceCount = clause.references?.length ?? 0;
          const warningCount = clause.warnings?.length ?? 0;

          return (
            <article
              key={clause.id}
              className={[
                "contract-clause",
                isDraft ? "contract-clause--draft" : "",
                isAi ? "contract-clause--ai" : "",
                isRecentlyApplied ? "contract-clause--just-applied" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="contract-clause__heading">
                <h3>
                  제{articleNumber}조<span>({clause.title})</span>
                </h3>

                <div className="contract-clause__actions">
                  {(isAi || isDraft) && warningCount > 0 && (
                    <span className="contract-clause__warning-chip">
                      확인사항 {warningCount}건
                    </span>
                  )}

                  {(isAi || isDraft) && referenceCount > 0 && (
                    <button
                      type="button"
                      className="contract-clause__evidence-button"
                      onClick={() => setSelectedEvidenceClause(clause)}
                    >
                      법령 근거 보기
                    </button>
                  )}

                  {isDraft && (
                    <div className="contract-clause__draft-label">
                      <i />
                      AI 작성 중
                    </div>
                  )}

                  {isAi && (
                    <div className="contract-clause__ai-label">추천 조항</div>
                  )}
                </div>
              </div>

              <p>
                {clause.content}

                {isDraft &&
                  (draftClause as unknown as { status?: "STREAMING" | "READY" })
                    ?.status === "STREAMING" && (
                    <i className="contract-clause__caret" />
                  )}
              </p>

              {isDraft &&
                (draftClause as unknown as { status?: "STREAMING" | "READY" })
                  ?.status === "READY" && (
                  <div className="contract-clause__pending">
                    <span />
                    아직 계약에 확정 반영되지 않은 초안입니다.
                  </div>
                )}
            </article>
          );
        })}
      </section>

      <LawReferenceModal
        open={Boolean(selectedEvidenceClause)}
        onClose={() => setSelectedEvidenceClause(null)}
        clauseTitle={selectedEvidenceClause?.title ?? ""}
        clauseSummary={selectedEvidenceClause?.summary}
        warnings={selectedEvidenceClause?.warnings ?? []}
        references={selectedEvidenceClause?.references ?? []}
      />
    </>
  );
}
