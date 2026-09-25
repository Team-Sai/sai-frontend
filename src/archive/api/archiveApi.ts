import { authFetch } from '../../auth/authFetch';
import type {
  ArchiveContractListResponse,
  ArchiveSettlementRow,
  SettlementArchivePreview,
} from '../types/archive';

export async function getArchiveContracts(page: number): Promise<ArchiveContractListResponse> {
  const response = await authFetch(`/api/contracts/dashboard?roleFilter=ALL&page=${page}`, {
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

export async function getSavedSettlementPdf(settlementId: number): Promise<Blob | null> {
  const response = await authFetch(`/api/settlements/${settlementId}/pdf`, {
    method: 'GET',
    headers: { Accept: 'application/pdf' },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`저장된 정산 PDF를 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  return response.blob();
}

export async function saveSettlementPdf(settlementId: number, pdf: Blob): Promise<void> {
  const form = new FormData();
  form.append('file', pdf, `정산_${settlementId}.pdf`);

  const response = await authFetch(`/api/settlements/${settlementId}/pdf`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`정산 PDF 저장에 실패했습니다. (HTTP ${response.status})`);
  }
}

