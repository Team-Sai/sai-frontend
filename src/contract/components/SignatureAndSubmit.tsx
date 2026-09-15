import { Button } from "../../common/components";
import styles from "./DocumentActions.module.css";
import { useEffect, useRef, useState } from "react";
import "./SignatureAndSubmit.css";

interface SignatureAndSubmitProps {
  title?: string;
  debtorUserToken?: string;
  onDebtorUserTokenChange?: (value: string) => void;
  isSubmitting: boolean;
  statusMessage: string | null;
  isError: boolean;
  onCancel?: () => void;
  onSubmit: (signature: Blob) => void;
  submitLabel?: string;
  agreementText?: string;
}

export default function SignatureAndSubmit({
  title = "금 전 차 용 계 약 서",
  debtorUserToken = "",
  onDebtorUserTokenChange,
  isSubmitting,
  statusMessage,
  isError,
  onCancel,
  onSubmit,
  submitLabel = "전송",
  agreementText = "위 약정 내용을 모두 확인하였으며, 전자 서명을 통한 최종 합의 의사를 기록합니다.",
}: SignatureAndSubmitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
      isSubmittingRef.current = false;
    }
  }, [isSubmitting]);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;

    const { x, y } = getPoint(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#181c1e";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function handleSubmitClick() {
    if (onDebtorUserTokenChange && !debtorUserToken.trim()) return;
    if (!hasSignature || !agreed || isSubmitting) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) {
      isSubmittingRef.current = false;
      return;
    }

    canvas.toBlob((blob) => {
      if (blob) {
        onSubmit(blob);
      } else {
        isSubmittingRef.current = false;
      }
    }, "image/png");
  }

  const canSubmit =
    (!onDebtorUserTokenChange || Boolean(debtorUserToken.trim())) &&
    hasSignature &&
    agreed &&
    !isSubmitting;

  return (
    <div className="doc" id="signatureCard">
      <h1 className="doc__title">{title}</h1>
      {onDebtorUserTokenChange && (
        <section className="doc__article">
          <span className="doc__clause">상대방 지정</span>
          <div className="doc__body">
            <span className="doc__text">
              차용증을 전달받을 채무자의 회원 토큰을 입력하세요.
            </span>
            <input
              type="text"
              className="doc__inline-input doc__inline-input--alias"
              placeholder="예: SAI_ABCD1234"
              value={debtorUserToken}
              onChange={(event) => onDebtorUserTokenChange(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </section>
      )}

      <section className="sign">
        <h2 className="sign__title">서명 (Signature)</h2>
        <p className="doc__hint">서명 패드에 수기 서명을 남겨주세요.</p>
        <div className="sign__pad-wrap">
          {!hasSignature && (
            <span className="sign__placeholder">SIGN HERE</span>
          )}
          <canvas
            ref={canvasRef}
            className="sign__canvas"
            width={590}
            height={220}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <Button
            type="button"
            variant="secondary"
            className="sign__clear"
            onClick={handleClear}
          >
            지우기
          </Button>
        </div>
      </section>

      <div className="agreement">
        <input
          type="checkbox"
          className="agreement__checkbox"
          id="agreeCheckbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <label className="agreement__label" htmlFor="agreeCheckbox">
          {agreementText}
        </label>
      </div>

      <div className="doc__actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
        )}
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSubmitClick}
          disabled={!canSubmit}
        >
          {isSubmitting ? "전송 중..." : submitLabel}
        </button>
      </div>

      <p
        className={`${styles.status} ${isError ? styles.error : ""}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </div>
  );
}
