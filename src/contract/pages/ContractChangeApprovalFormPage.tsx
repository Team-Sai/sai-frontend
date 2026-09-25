import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../shared.css';
import '../components/ContractDocument.css';
import '../components/PartiesInfo.css';
import ChangeApprovalStepper from '../components/ChangeApprovalStepper';
import { getContractDetail } from '../api/contractApi';
import { CONTRACT_STATUS_LABELS, REPAYMENT_METHOD_LABELS, type ContractDetail } from '../types/contract';

interface HttpError extends Error {
  status?: number;
}

export default function ContractChangeApprovalFormPage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();

  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!contractId) return;

    let cancelled = false;

    async function loadContract() {
      try {
        const data = await getContractDetail(Number(contractId));
        if (cancelled) return;

        setDetail(data);
        setLockMessage(data.status === 'COMPLETED' ? '이미 승인이 완료된 변경 건입니다.' : null);
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;

        const status = (error as HttpError).status;
        setIsError(true);
        setStatusMessage(
          status === 403
            ? '이 계약 변경 건에 접근할 권한이 없습니다.'
            : '계약서를 불러오지 못했습니다.',
        );
        setLockMessage('');
        setIsLoading(false);
      }
    }

    loadContract();

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  function handleNext() {
    if (!contractId) return;
    navigate(
      `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/change-approval/signature`)}`,
    );
  }

  const locked = lockMessage !== null && lockMessage !== '';
  const bannerText = detail ? `현재 상태: ${CONTRACT_STATUS_LABELS[detail.status]}` : null;

  return (
    <div className="page">
      <ChangeApprovalStepper currentStep={2} />

      <div className="doc" id="approveForm">
        <h1 className="doc__title">금 전 차 용 계 약 서 (변경)</h1>

        {bannerText && <p className="doc__status-banner">{bannerText}</p>}

        <section className="doc__article">
          <span className="doc__clause">제1조(당사자)</span>
          <div className="doc__body">
            <span className="doc__text">
              채권자 <strong className="doc__readonly">{detail?.creditorName ?? '-'}</strong>(이하 "갑"이라고 함)는
            </span>
            <span className="doc__text doc__text--indent">
              금{' '}
              <strong className="doc__readonly">
                {detail?.principalAmount != null ? detail.principalAmount.toLocaleString('ko-KR') : '-'}
              </strong>
              원을 채무자 <strong className="doc__readonly">{detail?.debtorName ?? '-'}</strong>(이하 "을"이라고 함)에게
              대여하고 을은 이를 차용한다.
            </span>
          </div>
        </section>

        <section className="doc__article">
          <span className="doc__clause">제2조(대출기간)</span>
          <div className="doc__body">
            <span className="doc__text">
              대출 시작일은 <strong className="doc__readonly">{detail?.startDate ?? '-'}</strong>로 한다.
            </span>
            <span className="doc__text doc__text--indent">
              차용금의 변제기한(만기일)은 <strong className="doc__readonly">{detail?.maturityDate ?? '-'}</strong>로
              한다.
            </span>
          </div>
        </section>

        <section className="doc__article">
          <span className="doc__clause">제3조(이자)</span>
          <span className="doc__text">
            이자는 연 <strong className="doc__readonly">{detail?.interestRate ?? '-'}</strong>%의 비율로 하며, 20%를
            초과할 수 없다.
          </span>
        </section>

        <section className="doc__article">
          <span className="doc__clause">제4조(변제방법)</span>
          <div className="doc__body">
            <span className="doc__text">
              채무의 변제는 갑의 주소 또는 갑이 지정하는 장소에 지참 또는 송금해서 지불하며,
            </span>
            <span className="doc__text doc__text--indent">
              매월 <strong className="doc__readonly">{detail?.repaymentDay ?? '-'}</strong>일에 지급하기로 한다.
            </span>
          </div>
        </section>

        <section className="doc__article">
          <span className="doc__clause">제5조(상환방식)</span>
          <span className="doc__text">
            <strong className="doc__readonly">
              {detail?.repaymentType ? REPAYMENT_METHOD_LABELS[detail.repaymentType] : '-'}
            </strong>
          </span>
        </section>

        <section className="doc__article">
          <span className="doc__clause">제6조(계약의 목적)</span>
          <span className="doc__text">
            <strong className="doc__readonly">{detail?.contractAlias ?? '-'}</strong>
          </span>
        </section>

        <section className="doc__article">
          <span className="doc__clause">제7조(특약사항)</span>
          <span className="doc__text">
            <strong className="doc__readonly">{detail?.terms || '특약사항 없음'}</strong>
          </span>
        </section>

        <p className="doc__closing">
          갑과 을은 상기 변경된 계약을 증명하기 위하여 본 계약서 2통을 작성하고, 각자 서명 날인한 후 1통씩을
          보관한다.
        </p>

        <table className="parties">
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '36%' }} />
          </colgroup>
          <tbody>
            <tr>
              <th className="parties__role">채권자</th>
              <td className="parties__label">성 명</td>
              <td className="parties__value">
                <strong className="doc__readonly">{detail?.creditorName ?? '-'}</strong>
              </td>
              <td className="parties__label">생년월일</td>
              <td className="parties__value">
                <strong className="doc__readonly">{detail?.creditorBirthDate ?? '-'}</strong>
              </td>
              <td className="parties__label">주 소</td>
              <td className="parties__value">
                <strong className="doc__readonly">{detail?.creditorAddress ?? '-'}</strong>
              </td>
            </tr>
            <tr>
              <th className="parties__role">채무자</th>
              <td className="parties__label">성 명</td>
              <td className="parties__value">
                <strong className="doc__readonly">{detail?.debtorName ?? '-'}</strong>
              </td>
              <td className="parties__label">생년월일</td>
              <td className="parties__value">
                <strong className="doc__readonly">{detail?.debtorBirthDate ?? '-'}</strong>
              </td>
              <td className="parties__label">주 소</td>
              <td className="parties__value">
                <strong className="doc__readonly">{detail?.debtorAddress ?? '-'}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <p className="doc__hint">위 변경된 계약 내용을 확인한 뒤, 다음 단계에서 전자서명을 진행해 주세요.</p>

        {!locked && (
          <div className="doc__actions">
            <button type="button" className="btn btn--primary" disabled={isLoading} onClick={handleNext}>
              {isLoading && <span className="button-spinner" aria-hidden="true" />}
              확인
            </button>
          </div>
        )}

        <p className={`doc__status ${isError ? 'is-error' : ''}`.trim()} role="status" aria-live="polite">
          {lockMessage || statusMessage}
        </p>
      </div>
    </div>
  );
}
