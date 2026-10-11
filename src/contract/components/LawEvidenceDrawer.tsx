import { useEffect, useState } from "react";

import { createPortal } from "react-dom";

import type {
  AppliedContractClause,
  ClauseReference,
} from "../types/clauseAgent";

import "./LawEvidenceDrawer.css";

interface LawEvidenceDrawerProps {
  clause: AppliedContractClause | null;

  onClose: () => void;
}

export default function LawEvidenceDrawer({
  clause,
  onClose,
}: LawEvidenceDrawerProps) {
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!clause) {
      return;
    }

    setSelectedReferenceId(clause.references[0]?.documentId ?? null);

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleEscape);
    };
  }, [clause, onClose]);

  if (!clause) {
    return null;
  }

  const selectedReference =
    clause.references.find(
      (reference) => reference.documentId === selectedReferenceId,
    ) ??
    clause.references[0] ??
    null;

  return createPortal(
    <div className="law-drawer-root">
      <button
        type="button"
        className="law-drawer-backdrop"
        aria-label="법령 근거 닫기"
        onClick={onClose}
      />

      <aside
        className="law-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="law-drawer-title"
      >
        {/* =========================
            HEADER
        ========================= */}

        <header className="law-drawer__header">
          <div>
            <span className="law-drawer__eyebrow">법령 근거</span>

            <h2 id="law-drawer-title">{clause.title}</h2>

            <p>
              이 조항을 작성할 때 확인한 법령과 현재 계약에 어떤 의미가 있는지
              함께 보여드립니다.
            </p>
          </div>

          <button type="button" className="law-drawer__close" onClick={onClose}>
            ×
          </button>
        </header>

        {/* =========================
            BODY
        ========================= */}

        <div className="law-drawer__body">
          {/* 이 계약에서의 의미 */}

          <section className="law-drawer-summary">
            <div className="law-drawer-section-label">
              <span>01</span>

              <strong>이 계약에서의 의미</strong>
            </div>

            <p>{clause.summary}</p>
          </section>

          {/* 주의사항 */}

          {clause.warnings.length > 0 && (
            <section className="law-drawer-warning">
              <div className="law-drawer-section-label">
                <span>!</span>

                <strong>확인할 내용</strong>
              </div>

              <div>
                {clause.warnings.map((warning, index) => (
                  <p key={`${index}-${warning}`}>{warning}</p>
                ))}
              </div>
            </section>
          )}

          {/* 법령 목록 */}

          <section className="law-drawer-laws">
            <div className="law-drawer-laws__title">
              <div className="law-drawer-section-label">
                <span>02</span>

                <strong>확인한 법령</strong>
              </div>

              <span>{clause.references.length}건</span>
            </div>

            <div className="law-drawer-law-tabs">
              {clause.references.map((reference, index) => (
                <button
                  type="button"
                  key={reference.documentId}
                  className={
                    reference.documentId === selectedReferenceId
                      ? "is-selected"
                      : ""
                  }
                  onClick={() => setSelectedReferenceId(reference.documentId)}
                >
                  <span>{index === 0 ? "핵심" : `${index + 1}`}</span>

                  <div>
                    <small>{reference.lawName}</small>

                    <strong>
                      {[reference.articleNumber, reference.articleTitle]
                        .filter(Boolean)
                        .join(" ")}
                    </strong>
                  </div>
                </button>
              ))}
            </div>

            {selectedReference && (
              <LawDocument
                reference={selectedReference}
                isPrimary={
                  selectedReference.documentId ===
                  clause.references[0]?.documentId
                }
              />
            )}
          </section>
        </div>
      </aside>
    </div>,

    document.body,
  );
}

/* =========================
   법령 문서
========================= */

function LawDocument({
  reference,
  isPrimary,
}: {
  reference: ClauseReference;

  isPrimary: boolean;
}) {
  return (
    <article className="law-drawer-document">
      <header>
        <div>
          {isPrimary && (
            <span className="law-drawer-document__primary">핵심 근거</span>
          )}

          <span className="law-drawer-document__law">{reference.lawName}</span>
        </div>

        <h3>
          {reference.articleNumber}

          {reference.articleTitle && ` ${reference.articleTitle}`}
        </h3>
      </header>

      <div className="law-drawer-document__original">
        <div className="law-drawer-document__original-label">법령 원문</div>

        <pre>{reference.content || "법령 원문을 불러오지 못했습니다."}</pre>
      </div>

      {reference.matchedIssue && (
        <footer>
          <span>관련 쟁점</span>

          <strong>{reference.matchedIssue}</strong>
        </footer>
      )}
    </article>
  );
}
