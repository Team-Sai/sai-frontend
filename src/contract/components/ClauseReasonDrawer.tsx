
import { useEffect, useMemo, useState } from "react";

import { createPortal } from "react-dom";

import type {
  AppliedContractClause,
  ClauseReference,
} from "../types/clauseAgent";

import { renderClauseContent } from "../utils/clauseSlots";

import "./ClauseReasonDrawer.css";

interface ClauseReasonDrawerProps {
  clause: AppliedContractClause | null;

  onClose: () => void;
}

function getIssueLabel(type: string): string {
  const labels: Record<string, string> = {
    DEFAULT: "채무불이행",

    ACCELERATION: "기한의 이익",

    EARLY_REPAYMENT: "중도상환",

    PENALTY: "위약금",

    INTEREST: "이자",

    LATE_INTEREST: "연체이자",

    REPAYMENT: "상환",

    GUARANTEE: "보증",

    COLLATERAL: "담보",

    EXECUTION: "강제집행",

    ELECTRONIC_SIGNATURE: "전자서명",

    OTHER: "기타",
  };

  return labels[type] ?? type;
}

function ClauseReasonDrawerContent({
  clause,
  onClose,
}: ClauseReasonDrawerProps & { clause: AppliedContractClause }) {
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(
    clause.references[0]?.documentId ?? null,
  );

  const [showAllReferences, setShowAllReferences] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedReference = useMemo(() => {
    return (
      clause.references.find(
        (reference) => reference.documentId === selectedReferenceId,
      ) ??
      clause.references[0] ??
      null
    );
  }, [clause, selectedReferenceId]);

  const renderedClause = renderClauseContent(clause);

  const primaryReference = clause.references[0] ?? null;

  const secondaryReferences = clause.references.slice(1);

  return createPortal(
    <div className="clause-reason-root">
      <button
        type="button"
        className="clause-reason-backdrop"
        aria-label="조항 근거 닫기"
        onClick={onClose}
      />

      <aside
        className="clause-reason"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clause-reason-title"
      >
        <header className="clause-reason__header">
          <div>
            <span className="clause-reason__header-label">조항 검토</span>

            <h2 id="clause-reason-title">{clause.title}</h2>

            <p>
              이 조항이 왜 필요한지와 계약서에 어떤 근거로 반영됐는지만 간단히
              정리했습니다.
            </p>
          </div>

          <button
            type="button"
            className="clause-reason__close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="clause-reason__body">
          <section className="clause-reason-section">
            <div className="clause-reason-section__title">
              <span>1</span>

              <div>
                <strong>왜 이 조항이 필요한가요?</strong>

                <small>현재 계약에서 확인한 핵심 쟁점</small>
              </div>
            </div>

            <div className="clause-reason-judgement">
              <div className="clause-reason-issues">
                {clause.issues.map((issue) => (
                  <span key={issue.type}>{getIssueLabel(issue.type)}</span>
                ))}
              </div>

              <p>{clause.summary}</p>
            </div>
          </section>

          {primaryReference && (
            <section className="clause-reason-section">
              <div className="clause-reason-section__title">
                <span>2</span>

                <div>
                  <strong>가장 중요한 법적 근거</strong>

                  <small>이 조항 판단에 가장 직접적으로 연결된 법령</small>
                </div>
              </div>

              <article className="clause-primary-law">
                <div className="clause-primary-law__heading">
                  <span className="clause-primary-law__badge">핵심 근거</span>

                  <div>
                    <div className="clause-primary-law__law-name">
                      {primaryReference.lawName}
                    </div>

                    <h3>
                      {primaryReference.articleNumber}

                      {primaryReference.articleTitle
                        ? ` ${primaryReference.articleTitle}`
                        : ""}
                    </h3>
                  </div>
                </div>

                <div className="clause-primary-law__meaning">
                  <strong>이 계약에서의 의미</strong>

                  <p>
                    이 조문은 현재 계약의{" "}
                    <b>
                      {primaryReference.matchedIssue
                        ? getIssueLabel(primaryReference.matchedIssue)
                        : "관련 조건"}
                    </b>
                    을 검토할 때 핵심 근거로 사용됐습니다. 법률이 자동으로 이번
                    특약을 정하는 것은 아니며, 해당 법률의 범위 안에서 당사자가
                    계약 조건을 정하는 방식으로 반영됩니다.
                  </p>
                </div>

                <div className="clause-primary-law__original">
                  <div className="clause-primary-law__original-title">
                    <strong>법령 원문</strong>
                  </div>

                  <pre>
                    {primaryReference.content ||
                      "법령 원문을 불러오지 못했습니다."}
                  </pre>
                </div>
              </article>

              {secondaryReferences.length > 0 && (
                <div className="clause-secondary-laws">
                  <button
                    type="button"
                    className="clause-secondary-laws__toggle"
                    onClick={() =>
                      setShowAllReferences((previous) => !previous)
                    }
                  >
                    <span>함께 확인한 법령 {secondaryReferences.length}건</span>

                    <b>{showAllReferences ? "접기" : "보기"}</b>
                  </button>

                  {showAllReferences && (
                    <div className="clause-secondary-laws__list">
                      {secondaryReferences.map((reference, index) => (
                        <button
                          type="button"
                          key={reference.documentId}
                          className={
                            reference.documentId === selectedReferenceId
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            setSelectedReferenceId(reference.documentId)
                          }
                        >
                          <span>{index + 2}</span>

                          <div>
                            <div className="clause-secondary-laws__law-name">
                              {reference.lawName}
                            </div>

                            <strong>
                              {reference.articleNumber}

                              {reference.articleTitle
                                ? ` ${reference.articleTitle}`
                                : ""}
                            </strong>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showAllReferences &&
                    selectedReference &&
                    selectedReference.documentId !==
                      primaryReference.documentId && (
                      <SecondaryLawDetail reference={selectedReference} />
                    )}
                </div>
              )}
            </section>
          )}

          <section className="clause-reason-section">
            <div className="clause-reason-section__title">
              <span>3</span>

              <div>
                <strong>계약서에는 이렇게 반영됐습니다</strong>

                <small>현재 계약에 들어간 실제 조항</small>
              </div>
            </div>

            <div className="clause-contract-result">
              <strong>{clause.title}</strong>

              <p>{renderedClause}</p>
            </div>
          </section>

          {clause.warnings.length > 0 && (
            <section className="clause-reason-warning">
              <strong>계약 전에 확인하세요</strong>

              {clause.warnings.slice(0, 3).map((warning, index) => (
                <p key={`${index}-${warning}`}>{warning}</p>
              ))}
            </section>
          )}
        </div>
      </aside>
    </div>,

    document.body,
  );
}

function SecondaryLawDetail({ reference }: { reference: ClauseReference }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="clause-secondary-detail">
      <div className="clause-secondary-detail__law-name">
        {reference.lawName}
      </div>

      <h4>
        {reference.articleNumber}

        {reference.articleTitle ? ` ${reference.articleTitle}` : ""}
      </h4>

      <p className="clause-secondary-detail__reason">
        이 법령은{" "}
        <b>
          {reference.matchedIssue
            ? getIssueLabel(reference.matchedIssue)
            : "관련 쟁점"}
        </b>
        을 함께 확인하기 위해 참고했습니다.
      </p>

      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
      >
        {expanded ? "원문 닫기" : "원문 보기"}
      </button>

      {expanded && (
        <pre>{reference.content || "법령 원문을 불러오지 못했습니다."}</pre>
      )}
    </article>
  );
}

export default function ClauseReasonDrawer(props: ClauseReasonDrawerProps) {
  if (!props.clause) {
    return null;
  }

  return (
    <ClauseReasonDrawerContent
      key={props.clause.id}
      {...props}
      clause={props.clause}
    />
  );
}
