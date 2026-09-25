import { useParams, useNavigate } from "react-router-dom";
import LoadingSkeleton from "../../common/components/LoadingSkeleton";
import { useEffect, useState } from "react";
import "../shared.css";
import "../styles/ContractDocumentPage.css";
import { getContractDocument } from "../api/contractDocumentApi";
import type { ContractDocumentDetail } from "../types/contractDocument";
import { REPAYMENT_METHOD_LABELS } from "../types/schedule";

export default function ContractDocumentPage() {
    const {contractId} = useParams();

    if (!contractId) {
        return <div className="contract-scope contract-scope--document">잘못된 접근입니다.</div>
    }

    return <ContractDocumentContent key={contractId} contractId={contractId} />;
}

function ContractDocumentContent({contractId} : {contractId: string}) {
    const navigate = useNavigate();
    const [data, setData] = useState<ContractDocumentDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getContractDocument(Number(contractId))
        .then((res) => {
            if (cancelled) return;
            setData(res);
            setError(null);
        })
        .catch(() => {
            if (cancelled) return;
            setError("계약서 정보를 불러오지 못했습니다.");
        })
        .finally(() => {
            if (!cancelled) setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [contractId]);

    if (isLoading) {
        return <div className="contract-scope contract-scope--document"><LoadingSkeleton className="loading-skeleton--page" rows={8} /></div>;
    }

    if (error || !data) {
        return <div className="contract-scope contract-scope--document">{error ?? "데이터가 없습니다."}</div>;
    }

    const {contract, canRequestChange} = data;

    return (
        <div className="contract-scope contract-scope--document">
            <div className="document-paper">
                <h1 className="document-title">금전소비대차계약서</h1>

                <section className="document-article">
                    <h2 className="document-article__heading">제1조 (당사자)</h2>
                    <p className="document-article__body">
                        채권자 {contract.creditorName}(이하 "갑")과 채무자 {contract.debtorName}(이하 "을")는
                        다음과 같이 금전소비대차계약을 체결한다.
                    </p>
                </section>

                <section className="document-article">
                    <h2 className="document-article__heading">제2조 (원금 및 이자)</h2>
                    <table className="document-table">
                        <tbody>
                            <tr>
                                <th>원금</th>
                                <td>{contract.principalAmount.toLocaleString("ko-KR")}원</td>
                            </tr>
                            <tr>
                                <th>이율</th>
                                <td>연 {contract.interestRate}%</td>
                            </tr>
                            <tr>
                                <th>계약일</th>
                                <td>{contract.startDate}</td>
                            </tr>
                            <tr>
                                <th>만기일</th>
                                <td>{contract.maturityDate}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="document-article">
                    <h2 className="document-article__heading">제3조 (상환방법)</h2>
                    <p className="document-article__body">
                        매월 {contract.repaymentDay}일에 {REPAYMENT_METHOD_LABELS[contract.repaymentType]} 방식으로 상환한다.
                    </p>
                </section>

                {contract.terms && (
                    <section className="document-article">
                        <h2 className="document-article__heading">제4조 (특약사항)</h2>
                        <p className="document-article__body">{contract.terms}</p>
                    </section>
                )}

                <div className="document-signature">
                    <div className="document-signature__party">
                        <span className="document-signature__label">채권자 (갑)</span>
                        <span className="document-signature__name">{contract.creditorName}</span>
                    </div>
                    <div className="document-signature__party">
                        <span className="document-signature__label">채무자 (을)</span>
                        <span className="document-signature__name">{contract.debtorName}</span>
                    </div>
                </div>
            </div>

            {canRequestChange && (
                <button
                type="button"
                className="btn-primary-small"
                onClick={() => navigate(`/contracts/${contractId}/change-request`)}
                >
                    계약 변경 요청
                </button>
            )}

            {!canRequestChange && (
                <p className="document-notice">현재 진행 중인 요청이 있어, 새 변경 요청을 할 수 없습니다.</p>
            )}
            <p className="disclaimer">
             * 본 계약서는 당사자 간 입력 정보 및 전자적 기반으로 작성·보관되는 문서로,
             서명 및 본인확인 절차의 방식에 따라 그 법적 효력의 범위나 효력 발생 요건에 관한 해석이 달라질 수 있어
             구체적인 법적 효력 여부는 별도 확인이 필요할 수 있습니다.
            </p>
        </div>
    )
}
