import { getLoanContract } from "../../contract/api/contractApi";
import { getScheduleSummary } from "../../contract/api/scheduleApi";
import type { LoanContractResponse } from "../../contract/types/contract";
import type { RepaymentScheduleSummary } from "../../contract/types/schedule";

export interface RepaymentHistoryVersion {
  contract: LoanContractResponse;
  summary: RepaymentScheduleSummary;
}

export interface RepaymentHistory {
  /** 최초 계약부터 현재 계약까지 오래된 순 */
  versions: RepaymentHistoryVersion[];
  current: RepaymentHistoryVersion;
  /** 모든 버전의 상환액 합계 (중도상환 포함) */
  totalPaidAmount: number;
}

// 변경 이력이 비정상적으로 길거나 순환할 때 무한 조회를 막는다.
const MAX_VERSIONS = 20;

/*
 * 계약이 변경되면 백엔드는 새 계약(previousContractId로 이전 계약을 가리킴)을 만들고,
 * 이전 계약에는 이미 납부한 회차만 남긴 뒤 남은 원금으로 새 계약의 스케줄을 다시 만든다.
 * 그래서 이전 계약을 거슬러 올라가며 각 버전의 스케줄을 모아야 전체 상환 이력이 된다.
 */
export async function loadRepaymentHistory(
  contractId: number,
): Promise<RepaymentHistory> {
  const contracts: LoanContractResponse[] = [];
  const visited = new Set<number>();
  let nextId: number | null = contractId;

  while (nextId != null && !visited.has(nextId) && contracts.length < MAX_VERSIONS) {
    visited.add(nextId);
    const contract = await getLoanContract(nextId);
    contracts.push(contract);
    nextId = contract.previousContractId;
  }

  contracts.reverse();

  const summaries = await Promise.all(
    contracts.map((contract) => getScheduleSummary(contract.contractId)),
  );

  const versions = contracts.map((contract, index) => ({
    contract,
    summary: summaries[index],
  }));

  return {
    versions,
    current: versions[versions.length - 1],
    totalPaidAmount: summaries.reduce((sum, summary) => sum + summary.paidAmount, 0),
  };
}
