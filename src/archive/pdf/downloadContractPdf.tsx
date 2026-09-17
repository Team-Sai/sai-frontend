import { pdf } from '@react-pdf/renderer';
import { getLoanContract } from '../../contract/api/contractApi';
import ContractPdfTemplate from './ContractPdfTemplate';

export async function downloadContractPdf(contractId: number): Promise<void> {
  const contract = await getLoanContract(contractId);
  const blob = await pdf(<ContractPdfTemplate contract={contract} />).toBlob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `차용증_${contract.contractId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}
