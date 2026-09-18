import { pdf } from '@react-pdf/renderer';
import {
  getLoanContract,
  getContractSignatures,
  getSavedContractPdf,
  saveContractPdf,
  type ContractSignatures,
} from '../../contract/api/contractApi';
import ContractPdfTemplate from './ContractPdfTemplate';

const EMPTY_SIGNATURES: ContractSignatures = {
  creditorSignatureDataUri: null,
  debtorSignatureDataUri: null,
};

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

export async function downloadContractPdf(contractId: number): Promise<void> {
  const filename = `차용증_${contractId}.pdf`;

  const savedPdf = await getSavedContractPdf(contractId);
  if (savedPdf) {
    triggerBlobDownload(savedPdf, filename);
    return;
  }

  const [contract, signatures] = await Promise.all([
    getLoanContract(contractId),
    getContractSignatures(contractId).catch((error) => {
      console.error('[downloadContractPdf] 서명 이미지 조회 실패, 서명 없이 진행합니다', error);
      return EMPTY_SIGNATURES;
    }),
  ]);

  const blob = await pdf(
    <ContractPdfTemplate
      contract={contract}
      creditorSignatureDataUri={signatures.creditorSignatureDataUri}
      debtorSignatureDataUri={signatures.debtorSignatureDataUri}
    />
  ).toBlob();

  triggerBlobDownload(blob, filename);

  try {
    await saveContractPdf(contractId, blob);
  } catch (error) {
    console.error('[downloadContractPdf] 차용증 PDF 보관 실패', error);
  }
}
