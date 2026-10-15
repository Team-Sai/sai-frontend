import { pdf } from '@react-pdf/renderer';
import { getSettlementArchivePreview, getSavedSettlementPdf, saveSettlementPdf } from '../api/archiveApi';
import SettlementPdfTemplate from './SettlementPdfTemplate';

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadSettlementPdf(settlementId: number): Promise<void> {
  const filename = `정산_${settlementId}.pdf`;

  const savedPdf = await getSavedSettlementPdf(settlementId);
  if (savedPdf) {
    triggerBlobDownload(savedPdf, filename);
    return;
  }

  const preview = await getSettlementArchivePreview(settlementId);
  const blob = await pdf(<SettlementPdfTemplate preview={preview} />).toBlob();

  triggerBlobDownload(blob, filename);

  try {
    await saveSettlementPdf(settlementId, blob);
  } catch (error) {
    console.error('[downloadSettlementPdf] 정산 PDF 보관 실패', error);
  }
}
