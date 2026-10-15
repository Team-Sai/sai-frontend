import type { ClauseSlot } from "../types/clauseAgent";

import { getClauseSlotError } from "../utils/clauseSlots";

import "./SmartClauseField.css";

interface SmartClauseFieldProps {
  slot: ClauseSlot;

  onChange: (value: string) => void;
}

export default function SmartClauseField({
  slot,
  onChange,
}: SmartClauseFieldProps) {
  const error = getClauseSlotError(slot);

  function handleNumberChange(rawValue: string) {
    if (rawValue === "") {
      onChange("");

      return;
    }

    const number = Number(rawValue);

    if (!Number.isFinite(number)) {
      return;
    }

    /*
     * min/max를 넘어가는 값은
     * 아예 입력 단계에서 막는다.
     */
    if (slot.min !== undefined && number < slot.min) {
      return;
    }

    if (slot.max !== undefined && number > slot.max) {
      return;
    }

    onChange(rawValue);
  }

  if (slot.type === "DATE") {
    return (
      <span className="smart-clause-field">
        <input
          type="date"
          className={error ? "has-error" : ""}
          value={slot.value}
          onChange={(event) => onChange(event.target.value)}
        />

        {error && <span className="smart-clause-field__hint">{error}</span>}
      </span>
    );
  }

  if (slot.type === "TEXT") {
    return (
      <span className="smart-clause-field smart-clause-field--text">
        <input
          type="text"
          className={error ? "has-error" : ""}
          placeholder={slot.label}
          value={slot.value}
          onChange={(event) => onChange(event.target.value)}
        />

        {error && <span className="smart-clause-field__hint">{error}</span>}
      </span>
    );
  }

  return (
    <span className="smart-clause-field smart-clause-field--number">
      <button
        type="button"
        className="smart-clause-field__step"
        disabled={
          !slot.value ||
          (slot.min !== undefined && Number(slot.value) <= slot.min)
        }
        onClick={() => {
          const current = Number(slot.value || slot.min || 0);

          const step = slot.step ?? 1;

          handleNumberChange(String(current - step));
        }}
      >
        −
      </button>

      <input
        type="number"
        className={error ? "has-error" : ""}
        min={slot.min}
        max={slot.max}
        step={slot.step ?? 1}
        placeholder={slot.label}
        value={slot.value}
        onChange={(event) => handleNumberChange(event.target.value)}
      />

      {slot.unit && <b>{slot.unit}</b>}

      <button
        type="button"
        className="smart-clause-field__step"
        disabled={
          slot.max !== undefined &&
          Boolean(slot.value) &&
          Number(slot.value) >= slot.max
        }
        onClick={() => {
          const current = Number(slot.value || slot.min || 0);

          const step = slot.step ?? 1;

          handleNumberChange(String(current + step));
        }}
      >
        +
      </button>

      <span className="smart-clause-field__label">{slot.label}</span>

      {error && <span className="smart-clause-field__hint">{error}</span>}
    </span>
  );
}
