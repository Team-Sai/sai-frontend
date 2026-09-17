import { authFetch } from '../../auth/authFetch';
import type {
  ArchiveContractListResponse,
  ArchiveSettlementRow,
  SettlementArchivePreview,
} from '../types/archive';

export async function getArchiveContracts(page: number): Promise<ArchiveContractListResponse> {
  const response = await authFetch(`/api/dashboard?roleFilter=ALL&page=${page}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`보관함을 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  return response.json();
}

export async function getArchiveSettlements(): Promise<ArchiveSettlementRow[]> {
  const response = await authFetch('/api/settlements', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`보관함을 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  return response.json();
}

export async function getSettlementArchivePreview(settlementId: number): Promise<SettlementArchivePreview> {
  const response = await authFetch(`/api/settlements/${settlementId}/archive-preview`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`정산 내역을 불러올 수 없습니다. (HTTP ${response.status})`);
  }

  return response.json();
}

