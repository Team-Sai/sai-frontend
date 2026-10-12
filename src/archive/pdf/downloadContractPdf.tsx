import { pdf } from "@react-pdf/renderer";

import {
  getContractAccount,
  getContractSignatures,
  getLoanContract,
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
  const objectUrl =
    window.URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href =
    objectUrl;

  anchor.download =
    filename;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  window.URL.revokeObjectURL(
    objectUrl,
  );
}


/*
 * 중요:
 * 기존 호출부와 호환되도록 인자는 contractId 하나만 받는다.
 *
 * 저장돼 있던 예전 PDF를 그대로 내려받지 않고,
 * 다운로드할 때 현재 ContractPdfTemplate으로 다시 생성한다.
 *
 * 따라서 ContractPdfTemplate 디자인 수정이
 * 기존 계약의 PDF에도 바로 반영된다.
 */
export async function downloadContractPdf(
  contractId: number,
): Promise<void> {
  const filename =
    `차용증_${contractId}.pdf`;

  const [
    contract,
    signatures,
    account,
  ] =
    await Promise.all([
      getLoanContract(
        contractId,
      ),

      getContractSignatures(
        contractId,
      ).catch(
        (error) => {
          console.error(
            "[downloadContractPdf] 서명 이미지 조회 실패",
            error,
          );

          return EMPTY_SIGNATURES;
        },
      ),

      getContractAccount(
        contractId,
      ).catch(
        (error) => {
          console.error(
            "[downloadContractPdf] 수취 계좌 조회 실패",
            error,
          );

          return null;
        },
      ),
    ]);

  const blob =
    await pdf(
      <ContractPdfTemplate
        contract={
          contract
        }
        account={
          account
        }
        creditorSignatureDataUri={
          signatures
            .creditorSignatureDataUri
        }
        debtorSignatureDataUri={
          signatures
            .debtorSignatureDataUri
        }
      />,
    ).toBlob();

  triggerBlobDownload(
    blob,
    filename,
  );

  /*
   * 서버 보관도 최신 생성본으로 갱신 시도.
   * 실패해도 사용자의 다운로드 자체는 이미 완료된다.
   */
  try {
    await saveContractPdf(
      contractId,
      blob,
    );
  } catch (error) {
    console.error(
      "[downloadContractPdf] 차용증 PDF 보관 실패",
      error,
    );
  }
}
