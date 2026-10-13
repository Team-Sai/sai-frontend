import { Button } from '../../common/components';

import type {
  ContractLegalReview,
  LegalReviewItem,
  LegalReviewStatus,
} from '../types/legalReview';

import './LegalReviewPanel.css';

interface LegalReviewPanelProps {
  review: ContractLegalReview | null;
  isLoading: boolean;
  error: string | null;
  hasReviewableInput: boolean;
  onRetry: () => void;
}

function getStatusLabel(
  status: LegalReviewStatus,
): string {
  switch (status) {
    case 'PASS':
      return '적합';

    case 'WARNING':
      return '확인 필요';

    case 'REVIEW':
      return '추가 검토';

    case 'ERROR':
      return '입력 오류';
  }
}

function getStatusIcon(
  status: LegalReviewStatus,
): string {
  switch (status) {
    case 'PASS':
      return '✓';

    case 'WARNING':
      return '!';

    case 'REVIEW':
      return '?';

    case 'ERROR':
      return '×';
  }
}

function LegalReviewCard({
  item,
}: {
  item: LegalReviewItem;
}) {
  const statusClass =
    item.status.toLowerCase();

  return (
    <article
      className={`legal-review-card legal-review-card--${statusClass}`}
    >
      <div className="legal-review-card__header">
        <div className="legal-review-card__title-wrap">
          <span
            className={`legal-review-card__icon legal-review-card__icon--${statusClass}`}
            aria-hidden="true"
          >
            {getStatusIcon(item.status)}
          </span>

          <h3 className="legal-review-card__title">
            {item.title}
          </h3>
        </div>

        <span
          className={`legal-review-card__badge legal-review-card__badge--${statusClass}`}
        >
          {getStatusLabel(item.status)}
        </span>
      </div>

      <p className="legal-review-card__summary">
        {item.summary}
      </p>

      <p className="legal-review-card__detail">
        {item.detail}
      </p>

      {item.references.length > 0 && (
        <section className="legal-review-card__section">
          <div className="legal-review-card__section-title">
            관련 법령 근거
          </div>

          <div className="legal-review-card__reference-list">
            {item.references.map(
              (reference) => (
                <div
                  key={
                    reference.documentId
                  }
                  className="legal-review-card__reference"
                >
                  <strong>
                    {reference.lawName}
                  </strong>

                  {(reference.articleNumber ||
                    reference.articleTitle) && (
                    <span>
                      {[
                        reference.articleNumber,
                        reference.articleTitle,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {item.suggestion && (
        <section className="legal-review-card__section">
          <div className="legal-review-card__section-title">
            권장 조치
          </div>

          <p className="legal-review-card__suggestion">
            {item.suggestion}
          </p>
        </section>
      )}
    </article>
  );
}

export default function LegalReviewPanel({
  review,
  isLoading,
  error,
  hasReviewableInput,
  onRetry,
}: LegalReviewPanelProps) {
  return (
    <aside className="legal-review-panel">
      <div className="legal-review-panel__header">
        <div>
          <div className="legal-review-panel__eyebrow">
            AI LEGAL REVIEW
          </div>

          <h2 className="legal-review-panel__title">
            법률 및 규정 검토
          </h2>
        </div>

        <div
          className={`legal-review-panel__status ${
            isLoading
              ? 'legal-review-panel__status--loading'
              : ''
          }`}
        >
          <span className="legal-review-panel__status-dot" />

          {isLoading
            ? '검토 중'
            : '자동 검토'}
        </div>
      </div>

      <p className="legal-review-panel__intro">
        작성 중인 차용증의 입력값을 기준으로
        관련 법령 및 규정을 자동 검토합니다.
      </p>

      {!hasReviewableInput && (
        <div className="legal-review-panel__empty">
          <div className="legal-review-panel__empty-icon">
            ✓
          </div>

          <strong>
            검토할 내용을 입력해 주세요.
          </strong>

          <p>
            대여금액과 이자율을 입력하면
            법률 검토가 자동으로 시작됩니다.
          </p>
        </div>
      )}

      {hasReviewableInput &&
        isLoading &&
        !review && (
          <div className="legal-review-panel__loading">
            <span className="legal-review-panel__spinner" />

            <div>
              <strong>
                관련 법령을 확인하고 있습니다.
              </strong>

              <p>
                잠시만 기다려 주세요.
              </p>
            </div>
          </div>
        )}

      {hasReviewableInput &&
        error && (
          <div className="legal-review-panel__error">
            <strong>
              법률 검토를 불러오지 못했습니다.
            </strong>

            <p>{error}</p>

            <Button
              type="button"
              variant="secondary"
              controlSize="sm"
              onClick={onRetry}
            >
              다시 검토
            </Button>
          </div>
        )}

      {hasReviewableInput &&
        review && (
          <>
            <section className="legal-review-summary">
              <div className="legal-review-summary__top">
                <span>
                  검토 결과 요약
                </span>

                <strong>
                  {review.summary.total}개 항목
                </strong>
              </div>

              <p className="legal-review-summary__message">
                {review.summary.message}
              </p>

              <p className="legal-review-summary__description">
                {
                  review.summary
                    .description
                }
              </p>

              <div className="legal-review-summary__counts">
                <div className="legal-review-summary__count">
                  <span className="legal-review-summary__dot legal-review-summary__dot--pass" />
                  <span>적합</span>
                  <strong>
                    {
                      review.summary
                        .passed
                    }
                  </strong>
                </div>

                <div className="legal-review-summary__count">
                  <span className="legal-review-summary__dot legal-review-summary__dot--warning" />
                  <span>확인</span>
                  <strong>
                    {
                      review.summary
                        .warning
                    }
                  </strong>
                </div>

                <div className="legal-review-summary__count">
                  <span className="legal-review-summary__dot legal-review-summary__dot--review" />
                  <span>검토</span>
                  <strong>
                    {
                      review.summary
                        .review
                    }
                  </strong>
                </div>

                <div className="legal-review-summary__count">
                  <span className="legal-review-summary__dot legal-review-summary__dot--error" />
                  <span>오류</span>
                  <strong>
                    {
                      review.summary
                        .error
                    }
                  </strong>
                </div>
              </div>
            </section>

            <div className="legal-review-panel__items">
              {review.items.map(
                (item) => (
                  <LegalReviewCard
                    key={`${item.field}-${item.type}`}
                    item={item}
                  />
                ),
              )}
            </div>

            <p className="legal-review-panel__disclaimer">
              {review.disclaimer}
            </p>
          </>
        )}
    </aside>
  );
}