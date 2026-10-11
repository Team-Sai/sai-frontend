import { useEffect, useMemo, useState } from "react";

import type { AppliedContractClause, ClauseSlot } from "../types/clauseAgent";

import {
  formatClauseSlotValue,
  getClauseSlotError,
  parseClauseTemplate,
} from "../utils/clauseSlots";

import "./ClauseSlotDialog.css";

interface ClauseSlotDialogProps {
  clause: AppliedContractClause | null;

  onClose: () => void;

  onSave: (clauseId: string, slots: ClauseSlot[]) => void;
}

export default function ClauseSlotDialog({
  clause,
  onClose,
  onSave,
}: ClauseSlotDialogProps) {
  const [slots, setSlots] = useState<ClauseSlot[]>([]);

  useEffect(() => {
    if (!clause) {
      return;
    }

    setSlots(
      clause.slots.map((slot) => ({
        ...slot,
      })),
    );
  }, [clause]);

  const errors = useMemo(
    () => slots.map((slot) => getClauseSlotError(slot)),
    [slots],
  );

  const hasError = errors.some(Boolean);

  if (!clause) {
    return null;
  }

  const tokens = parseClauseTemplate(clause.templateContent);

  function updateSlot(slotId: string, value: string) {
    setSlots((previous) =>
      previous.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              value,
            }
          : slot,
      ),
    );
  }

  return (
    <div
      className="clause-slot-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section className="clause-slot-dialog" role="dialog" aria-modal="true">
        <header className="clause-slot-dialog__header">
          <div>
            <span>계약 조건 입력</span>

            <h2>{clause.title}</h2>

            <p>문장은 그대로 유지하고, 필요한 계약 조건만 확정합니다.</p>
          </div>

          <button
            type="button"
            className="clause-slot-dialog__close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="clause-slot-dialog__body">
          {/* =====================================
              미리보기
          ===================================== */}

          <section className="clause-slot-dialog__preview">
            <div className="clause-slot-dialog__preview-title">
              <span>계약서 미리보기</span>

              <small>노란 부분만 입력하면 됩니다</small>
            </div>

            <p>
              {tokens.map((token, index) => {
                if (token.type === "TEXT") {
                  return <span key={`text-${index}`}>{token.value}</span>;
                }

                const slot = slots[token.slotIndex];

                if (!slot) {
                  return null;
                }

                const value = formatClauseSlotValue(slot);

                return (
                  <mark
                    key={slot.id}
                    className={value ? "is-filled" : "is-empty"}
                  >
                    {value || slot.label}
                  </mark>
                );
              })}
            </p>
          </section>

          {/* =====================================
              입력 영역
          ===================================== */}

          <section className="clause-slot-dialog__fields">
            <div className="clause-slot-dialog__fields-head">
              <div>
                <strong>확정할 조건</strong>

                <p>{slots.length}개 항목</p>
              </div>

              <span>모든 필수 항목을 확인해 주세요</span>
            </div>

            {slots.map((slot, index) => (
              <ClauseSlotInput
                key={slot.id}
                index={index}
                slot={slot}
                error={errors[index]}
                onChange={(value) => updateSlot(slot.id, value)}
              />
            ))}
          </section>
        </div>

        <footer className="clause-slot-dialog__footer">
          <button
            type="button"
            className="clause-slot-dialog__cancel"
            onClick={onClose}
          >
            나중에 입력
          </button>

          <button
            type="button"
            className="clause-slot-dialog__save"
            disabled={hasError}
            onClick={() => onSave(clause.id, slots)}
          >
            계약서에 적용
          </button>
        </footer>
      </section>
    </div>
  );
}

/* =========================================
   Slot input
========================================= */

function ClauseSlotInput({
  index,
  slot,
  error,
  onChange,
}: {
  index: number;

  slot: ClauseSlot;

  error: string | null;

  onChange: (value: string) => void;
}) {
  return (
    <div
      className={["clause-slot-row", error ? "has-error" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="clause-slot-row__number">{index + 1}</div>

      <div className="clause-slot-row__main">
        <div className="clause-slot-row__label">
          <strong>{slot.label}</strong>

          {slot.required && <span>필수</span>}
        </div>

        {/* 방법 선택 */}

        {slot.type === "METHOD" && (
          <div className="clause-slot-options">
            {slot.options?.map((option) => (
              <button
                type="button"
                key={option}
                className={slot.value === option ? "is-selected" : ""}
                onClick={() => onChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* 날짜 */}

        {slot.type === "DATE" && (
          <input
            type="date"
            className="clause-slot-standard-input"
            value={slot.value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}

        {/* 텍스트 */}

        {slot.type === "TEXT" && (
          <input
            type="text"
            className="clause-slot-standard-input"
            placeholder={`${slot.label} 입력`}
            value={slot.value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}

        {/* 숫자 */}

        {(slot.type === "PERCENT" ||
          slot.type === "MONEY" ||
          slot.type === "COUNT" ||
          slot.type === "DAYS" ||
          slot.type === "MONTHS") && (
          <div className="clause-slot-number-input">
            <button
              type="button"
              onClick={() => {
                const current = Number(slot.value || slot.min || 0);

                const step = slot.step ?? 1;

                const next = current - step;

                if (slot.min !== undefined && next < slot.min) {
                  return;
                }

                onChange(String(next));
              }}
            >
              −
            </button>

            <input
              type="number"
              min={slot.min}
              max={slot.max}
              step={slot.step}
              value={slot.value}
              placeholder="값 입력"
              onChange={(event) => {
                const value = event.target.value;

                if (value === "") {
                  onChange("");

                  return;
                }

                const number = Number(value);

                if (!Number.isFinite(number)) {
                  return;
                }

                if (slot.min !== undefined && number < slot.min) {
                  return;
                }

                if (slot.max !== undefined && number > slot.max) {
                  return;
                }

                onChange(value);
              }}
            />

            {slot.unit && <span>{slot.unit}</span>}

            <button
              type="button"
              onClick={() => {
                const current = Number(slot.value || slot.min || 0);

                const step = slot.step ?? 1;

                const next = current + step;

                if (slot.max !== undefined && next > slot.max) {
                  return;
                }

                onChange(String(next));
              }}
            >
              +
            </button>
          </div>
        )}

        {error && <p className="clause-slot-row__error">{error}</p>}
      </div>
    </div>
  );
}
