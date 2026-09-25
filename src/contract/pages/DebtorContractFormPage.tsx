import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../shared.css';
import '../components/ContractDocument.css';
import '../components/PartiesInfo.css';
import Stepper from '../components/Stepper';
import { getContractDetail, linkAsDebtor } from '../api/contractApi';
import {
  CONTRACT_STATUS_LABELS,
  DEBTOR_APPROVAL_DRAFT_KEY,
  REPAYMENT_METHOD_LABELS,
  type ContractDetail,
} from '../types/contract';

interface HttpError extends Error {
  status?: number;
}

export default function DebtorContractFormPage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const debtorAddressInputRef = useRef<HTMLInputElement>(null);

  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [debtorAddress, setDebtorAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [needsLinkConfirm, setNeedsLinkConfirm] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (!contractId) return;

    if (!sessionStorage.getItem('identityVerificationId')) {
      navigate(
        `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/approve`)}`,
        { replace: true },
      );
    }
  }, [contractId, navigate]);

  useEffect(() => {
    if (!contractId) return;

    let cancelled = false;

    async function loadContract() {
      try {
        const data = await getContractDetail(Number(contractId));
        if (cancelled) return;

        setNeedsLinkConfirm(false);
        setDetail(data);
        setDebtorAddress(data.debtorAddress ?? '');

        if (data.status === 'COMPLETED') {
          setLockMessage('이미 서명이 완료된 계약입니다.');
        } else if (data.status === 'DRAFT') {
          setLockMessage('채권자가 아직 계약서를 전송하지 않았습니다. 전송 후 다시 확인해 주세요.');
        } else {
          setLockMessage(null);
        }
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;

        const status = (error as HttpError).status;
        if (status === 403) {
          setNeedsLinkConfirm(true);
          setIsLoading(false);
          return;
        }

        setIsError(true);
        setStatusMessage('계약서를 불러오지 못했습니다.');
        setLockMessage('');
        setIsLoading(false);
      }
    }

    loadContract();

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  async function handleConfirmLink() {
    if (!contractId || isLinking) return;

    setIsLinking(true);
    setIsError(false);
    setStatusMessage(null);
    try {
      await linkAsDebtor(Number(contractId));
      setIsLoading(true);
      const data = await getContractDetail(Number(contractId));
      setNeedsLinkConfirm(false);
      setDetail(data);
      setDebtorAddress(data.debtorAddress ?? '');
      setLockMessage(
        data.status === 'COMPLETED'
          ? '이미 서명이 완료된 계약입니다.'
          : data.status === 'DRAFT'
              ? '채권자가 아직 계약서를 전송하지 않았습니다. 전송 후 다시 확인해 주세요.'
              : null,
      );
    } catch (error) {
      setIsError(true);
      setStatusMessage(error instanceof Error ? error.message : '계약서에 채무자로 연결하지 못했습니다.');
    } finally {
      setIsLoading(false);
      setIsLinking(false);
    }
  }

  function handleNext() {
    if (!debtorAddress.trim()) {
      setIsError(true);
      setStatusMessage('본인 주소를 입력해 주세요.');
      debtorAddressInputRef.current?.focus();
      return;
    }

    try {
      sessionStorage.setItem(DEBTOR_APPROVAL_DRAFT_KEY, JSON.stringify({ debtorAddress }));
    } catch {
      setIsError(true);
      setStatusMessage('입력 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    navigate(`/contracts/${contractId}/approve/signature`);
  }

  const locked = lockMessage !== null && lockMessage !== '';
  const bannerText = detail ? `현재 상태: ${CONTRACT_STATUS_LABELS[detail.status]}` : null;

  if (needsLinkConfirm) {
    return (
      <div className="page">
        <Stepper currentStep={3} />

        <div className="doc" id="approveForm">
          <h1 className="doc__title">금 전 차 용 계 약 서</h1>

          <p className="doc__hint">
            본인이 이 계약서의 채무자가 맞는 경우에만 아래 버튼을 눌러 계약과 연결해 주세요. 채무자로 연결하면 계약
            내용 확인 및 전자서명 절차가 시작됩니다.
          </p>

          <div className="doc__actions">
            <button type="button" className="btn btn--primary" disabled={isLinking} onClick={handleConfirmLink}>
              {isLinking ? '연결하는 중...' : '본인이 채무자입니다 - 연결하기'}
            </button>
          </div>

          <p className={`doc__status ${isError ? 'is-error' : ''}`.trim()} role="status" aria-live="polite">
            {statusMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Stepper currentStep={3} />

      <div className="doc" id="approveForm">
        <h1 className="doc__title">금 전 차 용 계 약 서</h1>

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
          갑과 을은 상기 계약을 증명하기 위하여 본 계약서 2통을 작성하고, 각자 서명 날인한 후 1통씩을 보관한다.
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
                <input
                  ref={debtorAddressInputRef}
                  type="text"
                  className="parties__input"
                  placeholder="본인 주소를 입력하세요"
                  value={debtorAddress}
                  onChange={(event) => setDebtorAddress(event.target.value)}
                  disabled={isLoading || locked}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="doc__hint">
          채권자가 작성한 아래 계약 내용을 확인한 뒤, 본인 주소를 입력하고 다음 단계에서 전자서명을 진행해 주세요.
        </p>

        <p className="doc__disclaimer">
          본 서비스가 제공하는 차용증 양식은 일반적인 금전소비대차 계약서 작성 편의를 위한 참고용 문서입니다. 서비스
          제공자는 이용자가 입력한 데이터의 정확성 및 개별 계약 조건에 따른 법적 분쟁에 대해 책임을 지지 않습니다.
          구체적인 법적 조언이나 강제집행력이 필요한 경우 법률 전문가의 상담 또는 공증 절차를 진행하시길 권장합니다.
        </p>

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
