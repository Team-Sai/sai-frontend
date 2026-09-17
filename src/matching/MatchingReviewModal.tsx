import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../common/components';
import TransactionList from '../transaction/TransactionList';
import { formatMoney } from '../transaction/format';
import type { Transaction } from '../transaction/types';
import { ReviewController } from './ReviewController';
import { canReview, transactionKey, type MatchingReviewSource } from './types';
import styles from './MatchingReviewModal.module.css';

export interface MatchingReviewModalProps {
  open: boolean;
  source: MatchingReviewSource;
  onClose: () => void;
  onStateChanged: () => void | Promise<void>;
}

export default function MatchingReviewModal(props: MatchingReviewModalProps) {
  if (!props.open) return null;
  return <ReviewSession key={JSON.stringify(props.source)} {...props} />;
}

function ReviewSession({ source, onClose, onStateChanged }: MatchingReviewModalProps) {
  const [controller] = useState(() => new ReviewController(source, onStateChanged));
  useEffect(() => { controller.setOnStateChanged(onStateChanged); }, [controller, onStateChanged]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const dialog = useRef<HTMLDialogElement>(null);
  const confirm = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const confirmCancel = useRef<HTMLButtonElement>(null);
  const rejectTrigger = useRef<HTMLElement | null>(null);
  const [rejectTransaction, setRejectTransaction] = useState<Transaction | null>(null);
  const titleId = useId();
  const confirmId = useId();
  const radioId = useId();

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    closeButton.current?.focus();
    controller.start();
    return () => {
      controller.stop();
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [controller]);

  useEffect(() => {
    if (!rejectTransaction) return;
    const element = confirm.current!;
    const returnTo = rejectTrigger.current;
    const fallback = closeButton.current;
    element.showModal();
    confirmCancel.current?.focus();
    return () => {
      element.close();
      if (returnTo?.isConnected && !returnTo.hasAttribute('disabled')) returnTo.focus();
      else if (fallback?.isConnected) fallback.focus();
    };
  }, [rejectTransaction]);

  useEffect(() => {
    const top = confirm.current?.open ? confirm.current : dialog.current;
    if (top && (!top.contains(document.activeElement) || document.activeElement?.matches(':disabled'))) {
      if (state.busy) top.focus();
      else if (top === confirm.current) confirmCancel.current?.focus();
      else closeButton.current?.focus();
    }
  }, [state.busy]);

  function keepFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const element = event.currentTarget;
    const controls = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); element.focus(); }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) {
      event.preventDefault(); first.focus();
    }
  }

  function close() {
    if (!controller.getSnapshot().busy) onClose();
  }

  function cancelReject() {
    if (!controller.getSnapshot().busy) setRejectTransaction(null);
  }

  const locked = state.busy || state.loading || state.pageStale;
  const title = source.kind === 'list' && source.reviewChannel === 'NOTIFICATION'
    ? '정산·차용증 매칭 선택' : '확인이 필요한 거래';

  return createPortal(<>
    <dialog ref={dialog} tabIndex={-1} className={styles.dialog} aria-labelledby={titleId} onKeyDown={keepFocus}
      onCancel={event => { event.preventDefault(); close(); }}>
      <header className={styles.header}>
        <div><h2 id={titleId}>{title}</h2><p>조회된 거래 {state.totalCount}건</p></div>
        <Button ref={closeButton} variant="text" className={styles.close} aria-label="매칭 검토 닫기" disabled={state.busy} onClick={close}>×</Button>
      </header>
      <div className={styles.body} aria-busy={state.busy || state.loading}>
        {state.message && <p className={styles.message} role="status">{state.message}</p>}
        {state.error && <div className={styles.error} role="alert">
          <p>{state.error}</p>
          <Button variant="secondary" controlSize="sm" disabled={state.busy || state.loading} onClick={controller.refresh}>목록 다시 불러오기</Button>
        </div>}
        {state.loading && <p role="status" className={styles.empty}>거래 정보를 불러오는 중입니다.</p>}
        {!state.loading && !state.error && !state.reviews.length && <p className={styles.empty}>현재 확인할 거래가 없습니다.</p>}
        {state.reviews.length > 0 && <TransactionList items={state.reviews.map(review => review.transaction)} renderContent={transaction => {
          const key = transactionKey(transaction);
          const outcome = state.outcomes[key];
          if (outcome) return <div className={styles.result} role="status">
            <p>{outcome.message}</p>
            {outcome.kind === 'uncertain' && <Button variant="secondary" disabled={state.busy || state.loading}
              onClick={() => void controller.checkStatus(transaction)}>상태 다시 확인</Button>}
          </div>;
          if (state.deferred.includes(key)) return <p className={styles.result}>나중에 확인 — 거래는 확인 필요 상태로 유지됩니다.</p>;
          if (!canReview(transaction)) return <p className={styles.result}>현재 매칭 검토 대상이 아닙니다.</p>;
          const candidates = state.reviews.find(review => transactionKey(review.transaction) === key)!.candidates;
          return <fieldset className={styles.candidates} disabled={locked}>
            <legend>반영할 대상을 하나 선택해 주세요.</legend>
            {!candidates.length && <p>현재 선택할 수 있는 후보가 없습니다.</p>}
            {candidates.map(candidate => {
              const selected = state.selections[key] === candidate.matchCandidateId;
              const difference = transaction.amount - candidate.expectedRemainingAmount;
              const label = candidate.targetType === 'LOAN' ? '차용증' : '정산';
              return <label key={candidate.matchCandidateId} className={`${styles.candidate} ${selected ? styles.selected : ''}`}>
                <input type="radio" name={`${radioId}-${key}`} value={candidate.matchCandidateId} checked={selected}
                  onChange={() => controller.select(transaction, candidate.matchCandidateId)} />
                <span className={styles.candidateName}>
                  <strong>{candidate.targetName || `${label} #${candidate.aggregateId}`}</strong>
                  <small><span className={candidate.targetType === 'LOAN' ? styles.loan : styles.settlement}>{label}</span> 참여자 {candidate.participantName || '-'}</small>
                </span>
                <span><small>예정 잔여금액</small><strong>{formatMoney(candidate.expectedRemainingAmount)}</strong></span>
                <span className={difference < 0 ? styles.short : ''}>
                  <small>{{ EXACT: '정확 일치', PARTIAL: '부분입금', EXCESS: '초과입금' }[candidate.amountMatchType]}</small>
                  <span>{difference === 0 ? '정확히 일치' : `${formatMoney(Math.abs(difference))} ${difference > 0 ? '초과' : '부족'}`}</span>
                </span>
              </label>;
            })}
          </fieldset>;
        }} renderActions={transaction => {
          const key = transactionKey(transaction);
          if (!canReview(transaction) || state.outcomes[key] || state.deferred.includes(key)) return null;
          return <div className={styles.actions}>
            <Button variant="text" disabled={locked} onClick={() => controller.defer(transaction)}>나중에 하기</Button>
            <Button variant="secondary" disabled={locked} onClick={event => {
              rejectTrigger.current = event.currentTarget;
              setRejectTransaction(transaction);
            }}>어느 후보도 아님</Button>
            <Button disabled={locked || !state.selections[key]} isLoading={state.busy}
              onClick={() => void controller.process(transaction)}>선택하여 반영</Button>
          </div>;
        }} />}
      </div>
      {state.hasNext && <footer className={styles.footer}>
        <Button variant="secondary" disabled={locked} onClick={controller.more}>더 보기</Button>
      </footer>}
    </dialog>
    {rejectTransaction && <dialog ref={confirm} tabIndex={-1} className={`${styles.dialog} ${styles.confirm}`} role="alertdialog" aria-labelledby={confirmId} onKeyDown={keepFocus}
      onCancel={event => { event.preventDefault(); cancelReject(); }}>
      <h3 id={confirmId}>어느 후보도 아닌가요?</h3>
      <p>이 거래를 어느 정산이나 차용증에도 반영하지 않으시겠어요?</p>
      <small>미매칭 처리하면 현재 확인 목록에서 제외됩니다.</small>
      <div className={styles.actions}>
        <Button ref={confirmCancel} variant="secondary" disabled={state.busy} onClick={cancelReject}>취소</Button>
        <Button className={styles.danger} isLoading={state.busy} onClick={() => {
          if (controller.getSnapshot().busy) return;
          void controller.process(rejectTransaction, true).finally(() => setRejectTransaction(null));
        }}>미매칭 처리</Button>
      </div>
    </dialog>}
  </>, document.body);
}
