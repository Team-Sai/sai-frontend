import { pdf } from '@react-pdf/renderer';
import { getSettlementArchivePreview } from '../api/archiveApi';
import SettlementPdfTemplate from './SettlementPdfTemplate';

export async function downloadSettlementPdf(settlementId: number): Promise<void> {
  const preview = await getSettlementArchivePreview(settlementId);
  const blob = await pdf(<SettlementPdfTemplate preview={preview} />).toBlob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `정산_${preview.settlementId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}
