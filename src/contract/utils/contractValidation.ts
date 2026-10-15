import type { ContractFormData } from "../types/contract";

export interface ContractFieldWarning {
  field:
    | "principalAmount"
    | "interestRate"
    | "startDate"
    | "maturityDate"
    | "repaymentDay";

  level: "ERROR" | "WARNING";

  title: string;

  message: string;
}

function parseLocalDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addOneCalendarMonth(value: Date): Date {
  const year = value.getFullYear();

  const month = value.getMonth();

  const day = value.getDate();

  /*
   * 다음 달의 마지막 날짜
   */
  const lastDayOfNextMonth = new Date(year, month + 2, 0, 12).getDate();

  return new Date(year, month + 1, Math.min(day, lastDayOfNextMonth), 12);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getContractFieldWarnings(
  formData: ContractFormData,
): ContractFieldWarning[] {
  const warnings: ContractFieldWarning[] = [];

  const principal = Number(formData.principalAmount);

  if (
    formData.principalAmount &&
    (!Number.isFinite(principal) || principal <= 0)
  ) {
    warnings.push({
      field: "principalAmount",

      level: "ERROR",

      title: "대여원금을 확인해 주세요",

      message: "대여원금은 0원보다 큰 금액이어야 합니다.",
    });
  }

  const rate = Number(formData.interestRate);

  if (
    formData.interestRate &&
    (!Number.isFinite(rate) ||
      rate < 0.5 ||
      rate > 20 ||
      !Number.isInteger(rate * 2))
  ) {
    warnings.push({
      field: "interestRate",

      level: "ERROR",

      title: "약정이율을 확인해 주세요",

      message:
        "약정이율은 연 0.5% 이상 20% 이하이며 0.5% 단위로 입력해 주세요.",
    });
  }

  const repaymentDay = Number(formData.repaymentDay);

  if (
    formData.repaymentDay &&
    (!Number.isInteger(repaymentDay) || repaymentDay < 1 || repaymentDay > 31)
  ) {
    warnings.push({
      field: "repaymentDay",

      level: "ERROR",

      title: "정기 상환일을 확인해 주세요",

      message: "매월 상환일은 1일부터 31일 사이여야 합니다.",
    });
  }

  const startDate = parseLocalDate(formData.startDate);

  const maturityDate = parseLocalDate(formData.maturityDate);

  if (startDate && maturityDate) {
    if (maturityDate <= startDate) {
      warnings.push({
        field: "maturityDate",

        level: "ERROR",

        title: "대여기간이 올바르지 않습니다",

        message: `최종 변제일(${formData.maturityDate})은 대여일(${formData.startDate}) 이후여야 합니다.`,
      });

      return warnings;
    }

    /*
     * 서비스 정책:
     * 대여기간 최소 1개월
     */
    const minimumMaturityDate = addOneCalendarMonth(startDate);

    if (maturityDate < minimumMaturityDate) {
      warnings.push({
        field: "maturityDate",

        level: "ERROR",

        title: "대여기간은 최소 1개월이어야 합니다",

        message: `대여일이 ${formData.startDate}이면 최종 변제일은 ${formatDate(
          minimumMaturityDate,
        )} 이후로 설정해 주세요.`,
      });
    }
  }

  return warnings;
}

export function findContractWarning(
  warnings: ContractFieldWarning[],

  field: ContractFieldWarning["field"],
) {
  return warnings.find((warning) => warning.field === field);
}
