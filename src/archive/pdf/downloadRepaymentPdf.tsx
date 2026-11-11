import { pdf } from "@react-pdf/renderer";
import RepaymentPdfTemplate from "./RepaymentPdfTemplate";
import { loadRepaymentHistory } from "./repaymentHistory";

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}

/*
 * 상환 내역은 상환할 때마다 바뀌므로 서버에 보관하지 않고
 * 다운로드할 때마다 최신 스케줄로 새로 만든다.
 */
export async function downloadRepaymentPdf(contractId: number): Promise<void> {
  const history = await loadRepaymentHistory(contractId);
  const blob = await pdf(<RepaymentPdfTemplate history={history} />).toBlob();

  triggerBlobDownload(blob, `상환내역_${contractId}.pdf`);
}
