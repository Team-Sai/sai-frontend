import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./LawReferenceModal.css";

export interface LawReferenceItem {
  documentId: string;
  lawName: string;
  articleNumber?: string | null;
  articleTitle?: string | null;
  content?: string;
  matchedIssue?: string;
  score?: number;
}

interface LawReferenceModalProps {
  open: boolean;
  onClose: () => void;
  clauseTitle: string;
  clauseSummary?: string;
  warnings?: string[];
  references: LawReferenceItem[];
}

export default function LawReferenceModal({
  open,
  onClose,
  clauseTitle,
  clauseSummary,
  warnings = [],
  references,
}: LawReferenceModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="law-reference-modal"
      role="dialog"
      aria-modal="true"
      aria-label="법령 근거 상세 보기"
    >
      <div className="law-reference-modal__backdrop" onClick={onClose} />

      <div className="law-reference-modal__panel">
        <div className="law-reference-modal__header">
          <div>
            <div className="law-reference-modal__eyebrow">
              법령 근거 상세 보기
            </div>
            <h2>{clauseTitle}</h2>
            <p>
              이 조항을 작성할 때 참고한 법령과, 현재 계약에 어떤 의미가
              있는지를 한 번에 확인합니다.
            </p>
          </div>

          <button
            type="button"
            className="law-reference-modal__close"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="law-reference-modal__body">
          {(clauseSummary || warnings.length > 0) && (
            <section className="law-reference-modal__summary">
              <div className="law-reference-modal__summary-card">
                <h3>쉽게 보면</h3>
                <p>
                  {clauseSummary ||
                    "이 조항은 계약 내용과 관련 법령을 함께 고려해 추천된 문구입니다."}
                </p>
              </div>

              {warnings.length > 0 && (
                <div className="law-reference-modal__warning-card">
                  <h3>반영 전 확인할 점</h3>
                  <ul>
                    {warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="law-reference-modal__references">
            <div className="law-reference-modal__section-title">
              <h3>검토한 법령 원문</h3>
              <span>{references.length}건</span>
            </div>

            {references.length === 0 ? (
              <div className="law-reference-modal__empty">
                표시할 법령 근거가 없습니다.
              </div>
            ) : (
              <div className="law-reference-modal__reference-list">
                {references.map((reference, index) => (
                  <article
                    key={`${reference.documentId}-${index}`}
                    className="law-reference-modal__reference-card"
                  >
                    <div className="law-reference-modal__reference-top">
                      <div className="law-reference-modal__reference-title-wrap">
                        <div className="law-reference-modal__reference-badge">
                          {index === 0 ? "핵심 근거" : `근거 ${index + 1}`}
                        </div>

                        <h4>
                          {reference.lawName}
                          {reference.articleNumber
                            ? ` ${reference.articleNumber}`
                            : ""}
                          {reference.articleTitle
                            ? ` ${reference.articleTitle}`
                            : ""}
                        </h4>
                      </div>

                      {reference.matchedIssue && (
                        <span className="law-reference-modal__matched-issue">
                          {reference.matchedIssue}
                        </span>
                      )}
                    </div>

                    <div className="law-reference-modal__reference-meta">
                      <span>문서 ID: {reference.documentId}</span>
                    </div>

                    <div className="law-reference-modal__reference-content">
                      {reference.content ? (
                        <pre>{reference.content}</pre>
                      ) : (
                        <p>원문 내용이 제공되지 않았습니다.</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
