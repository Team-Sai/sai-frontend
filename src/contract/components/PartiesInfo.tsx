import { Input } from '../../common/components';
import './PartiesInfo.css';
import type { CreditorInfo } from '../types/contract';

interface PartiesInfoProps {
  creditorInfo: CreditorInfo | null;
  creditorAddress: string;
  onCreditorAddressChange: (value: string) => void;
  disabled?: boolean;
}

export default function PartiesInfo({
  creditorInfo,
  creditorAddress,
  onCreditorAddressChange,
  disabled = false,
}: PartiesInfoProps) {
  return (
    <>
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
              <strong className="doc__readonly">{creditorInfo?.name ?? '-'}</strong>
            </td>
            <td className="parties__label">생년월일</td>
            <td className="parties__value">
              <strong className="doc__readonly">{creditorInfo?.birthDate ?? '-'}</strong>
            </td>
            <td className="parties__label">주 소</td>
            <td className="parties__value">
              <Input variant="borderless" aria-label="채권자 주소"
                type="text"
                placeholder="주소를 입력하세요"
                value={creditorAddress}
                onChange={(event) => onCreditorAddressChange(event.target.value)}
                disabled={disabled}
              />
            </td>
          </tr>
          <tr>
            <th className="parties__role">채무자</th>
            <td className="parties__label">성 명</td>
            <td className="parties__value">
              <Input variant="borderless" aria-label="채무자 성명" type="text" disabled placeholder="자동 입력" />
            </td>
            <td className="parties__label">생년월일</td>
            <td className="parties__value">
              <Input variant="borderless" aria-label="채무자 생년월일" type="text" disabled placeholder="자동 입력" />
            </td>
            <td className="parties__label">주 소</td>
            <td className="parties__value">
              <Input variant="borderless" aria-label="채무자 주소"
                type="text"
                disabled
                placeholder="채무자 확인 후 자동 입력됩니다"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <p className="doc__hint">
        채무자 정보는 채무자가 직접 확인·서명하는 단계에서 채워지며, 현재 화면에서는 입력할 수 없습니다.
      </p>
    </>
  );
}
