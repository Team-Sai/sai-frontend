import { pdf } from "@react-pdf/renderer";

import {
  getContractAccount,
  getContractSignatures,
  getLoanContract,
  getSavedContractPdf,
  saveContractPdf,
  type ContractSignatures,
} from "../../contract/api/contractApi";

import ContractPdfTemplate from "./ContractPdfTemplate";

const EMPTY_SIGNATURES: ContractSignatures = {
  creditorSignatureDataUri: null,

  debtorSignatureDataUri: null,
};

function triggerBlobDownload(
  blob: Blob,

  filename: string,
): void {
  const objectUrl = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = objectUrl;

  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadContractPdf(contractId: number): Promise<void> {
  const filename = `차용증_${contractId}.pdf`;

  /*
   * 기존 구조 그대로:
   *
   * 이미 보관된 PDF가 있으면
   * 다시 생성하지 않고 그대로 사용.
   */
  const savedPdf = await getSavedContractPdf(contractId);

  if (savedPdf) {
    triggerBlobDownload(savedPdf, filename);

    return;
  }

  /*
   * 아직 저장된 PDF가 없으면
   * 계약 + 서명 + 계좌를 조회해서 생성.
   */
  const [contract, signatures, account] = await Promise.all([
    getLoanContract(contractId),

    getContractSignatures(contractId).catch((error) => {
      console.error("[downloadContractPdf] 서명 이미지 조회 실패", error);

      return EMPTY_SIGNATURES;
    }),

    getContractAccount(contractId).catch((error) => {
      console.error("[downloadContractPdf] 수취 계좌 조회 실패", error);

      return null;
    }),
  ]);

  const blob = await pdf(
    <ContractPdfTemplate
      contract={contract}
      account={account}
      creditorSignatureDataUri={signatures.creditorSignatureDataUri}
      debtorSignatureDataUri={signatures.debtorSignatureDataUri}
    />,
  ).toBlob();

  triggerBlobDownload(blob, filename);

  /*
   * 이것도 기존 ZIP의 방식 그대로.
   * 최초 생성한 PDF를 서버에 보관.
   */
  try {
    await saveContractPdf(contractId, blob);
  } catch (error) {
    console.error("[downloadContractPdf] 차용증 PDF 보관 실패", error);
  }
}
