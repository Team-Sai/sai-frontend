import { getLoanContract } from "../../contract/api/contractApi";
import type { LoanContractResponse } from "../../contract/types/contract";

// 변경 이력이 비정상적으로 길거나 순환할 때 무한 조회를 막는다.
const MAX_VERSIONS = 20;

/*
 * 계약이 변경되면 백엔드는 새 계약(previousContractId로 이전 계약을 가리킴)을 만든다.
 * 주어진 계약에서 previousContractId를 거슬러 올라가며 모든 버전을 모은 뒤
 * 최초 계약(V1)부터 오래된 순으로 반환한다.
 */
export async function loadContractVersions(
  contractId: number,
): Promise<LoanContractResponse[]> {
  const contracts: LoanContractResponse[] = [];
  const visited = new Set<number>();
  let nextId: number | null = contractId;

  while (nextId != null && !visited.has(nextId) && contracts.length < MAX_VERSIONS) {
    visited.add(nextId);
    const contract = await getLoanContract(nextId);
    contracts.push(contract);
    nextId = contract.previousContractId;
  }

  return contracts.reverse();
}
