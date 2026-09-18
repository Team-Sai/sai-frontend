import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { registerPdfFonts, PDF_FONT_FAMILY } from './fonts';
import { REPAYMENT_METHOD_LABELS, type LoanContractResponse } from '../../contract/types/contract';

registerPdfFonts();

const COLORS = {
  primary: '#006E2A',
  text: '#1a1a1a',
  muted: '#697080',
  border: '#CFD5E2',
  roleBg: '#f0f7f2',
  labelBg: '#f3f4f5',
};

function formatAmount(amount: number): string {
  return Number(amount).toLocaleString('ko-KR');
}

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: COLORS.text,
    padding: '12mm 8mm',
  },
  title: {
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 3,
    marginBottom: 26,
  },
  article: {
    marginBottom: 12,
  },
  articleRow: {
    flexDirection: 'row',
  },
  clause: {
    width: 78,
    color: COLORS.primary,
    fontWeight: 700,
  },
  body: {
    flex: 1,
  },
  text: {
    color: COLORS.text,
    lineHeight: 1.7,
  },
  textIndent: {
    marginTop: 3,
  },
  readonly: {
    color: COLORS.primary,
    fontWeight: 700,
  },
  closing: {
    fontSize: 9.5,
    color: COLORS.muted,
    lineHeight: 1.7,
    marginTop: 18,
    marginBottom: 14,
    textAlign: 'center',
  },

  partiesTable: {
    borderTopWidth: 1.5,
    borderTopColor: COLORS.primary,
    borderLeftWidth: 0.75,
    borderLeftColor: COLORS.border,
    marginBottom: 20,
  },
  partiesRow: {
    flexDirection: 'row',
  },
  partiesRole: {
    width: '12%',
    backgroundColor: COLORS.roleBg,
    color: COLORS.primary,
    fontWeight: 700,
    fontSize: 8.5,
    textAlign: 'center',
    padding: 7,
    borderRightWidth: 0.75,
    borderRightColor: COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.border,
  },
  partiesLabel: {
    width: '12%',
    backgroundColor: COLORS.labelBg,
    color: COLORS.muted,
    fontWeight: 600,
    fontSize: 8.5,
    textAlign: 'center',
    padding: 7,
    borderRightWidth: 0.75,
    borderRightColor: COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.border,
  },
  partiesValue: {
    fontSize: 8.5,
    padding: 7,
    borderRightWidth: 0.75,
    borderRightColor: COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.border,
  },
  partiesValueName: {
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureImage: {
    width: 14,
    height: 14,
    marginLeft: 4,
  },
  partiesValueBirth: {
    width: '14%',
  },
  partiesValueAddress: {
    width: '32%',
  },

  disclaimer: {
    fontSize: 7.5,
    color: COLORS.muted,
    lineHeight: 1.6,
  },
});

interface ContractPdfTemplateProps {
  contract: LoanContractResponse;
  creditorSignatureDataUri?: string | null;
  debtorSignatureDataUri?: string | null;
}

export default function ContractPdfTemplate({
  contract,
  creditorSignatureDataUri,
  debtorSignatureDataUri,
}: ContractPdfTemplateProps) {
  const repaymentTypeLabel = REPAYMENT_METHOD_LABELS[contract.repaymentType] ?? contract.repaymentType;

  return (
    <Document title={`차용증_${contract.contractId}`} author="사이원장" subject="금전 차용 계약서" language="ko">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>금 전 차 용 계 약 서</Text>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제1조(당사자)</Text>
            <View style={styles.body}>
              <Text style={styles.text}>
                채권자 <Text style={styles.readonly}>{contract.creditorName}</Text>(이하 "갑"이라고 함)는
              </Text>
              <Text style={[styles.text, styles.textIndent]}>
                금 <Text style={styles.readonly}>{formatAmount(contract.principalAmount)}</Text> 원을 채무자{' '}
                <Text style={styles.readonly}>{contract.debtorName ?? '-'}</Text>(이하 "을"이라고 함)에게 대여하고 을은
                이를 차용한다.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제2조(대출기간)</Text>
            <View style={styles.body}>
              <Text style={styles.text}>
                대출 시작일은 <Text style={styles.readonly}>{contract.startDate}</Text>로 한다.
              </Text>
              <Text style={[styles.text, styles.textIndent]}>
                차용금의 변제기한(만기일)은 <Text style={styles.readonly}>{contract.maturityDate}</Text>로 한다.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제3조(이자)</Text>
            <Text style={[styles.text, styles.body]}>
              이자는 연 <Text style={styles.readonly}>{contract.interestRate}</Text>%의 비율로 하며, 20%를 초과할 수
              없다.
            </Text>
          </View>
        </View>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제4조(변제방법)</Text>
            <View style={styles.body}>
              <Text style={styles.text}>채무의 변제는 갑의 주소 또는 갑이 지정하는 장소에 지참 또는 송금해서 지불하며,</Text>
              <Text style={[styles.text, styles.textIndent]}>
                매월 <Text style={styles.readonly}>{contract.repaymentDay}</Text>일에 지급하기로 한다.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제5조(상환방식)</Text>
            <Text style={[styles.text, styles.body, styles.readonly]}>{repaymentTypeLabel}</Text>
          </View>
        </View>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제6조(계약의 목적)</Text>
            <Text style={[styles.text, styles.body, styles.readonly]}>{contract.contractAlias}</Text>
          </View>
        </View>

        <View style={styles.article}>
          <View style={styles.articleRow}>
            <Text style={styles.clause}>제7조(특약사항)</Text>
            <Text style={[styles.text, styles.body, styles.readonly]}>{contract.terms ?? '-'}</Text>
          </View>
        </View>

        <Text style={styles.closing}>
          갑과 을은 상기 계약을 증명하기 위하여 본 계약서 2통을 작성하고, 각자 서명 날인한 후 1통씩을 보관한다.
        </Text>

        <View style={styles.partiesTable}>
          <View style={styles.partiesRow} wrap={false}>
            <Text style={styles.partiesRole}>채권자</Text>
            <Text style={styles.partiesLabel}>성 명</Text>
            <View style={[styles.partiesValue, styles.partiesValueName]}>
              <Text style={styles.readonly}>{contract.creditorName} (인)</Text>
              {creditorSignatureDataUri && <Image src={creditorSignatureDataUri} style={styles.signatureImage} />}
            </View>
            <Text style={styles.partiesLabel}>생년월일</Text>
            <Text style={[styles.partiesValue, styles.partiesValueBirth, styles.readonly]}>
              {contract.creditorBirthDate}
            </Text>
            <Text style={styles.partiesLabel}>주 소</Text>
            <Text style={[styles.partiesValue, styles.partiesValueAddress, styles.readonly]}>
              {contract.creditorAddress ?? '-'}
            </Text>
          </View>
          <View style={styles.partiesRow} wrap={false}>
            <Text style={styles.partiesRole}>채무자</Text>
            <Text style={styles.partiesLabel}>성 명</Text>
            <View style={[styles.partiesValue, styles.partiesValueName]}>
              <Text style={styles.readonly}>{contract.debtorName ?? '-'} (인)</Text>
              {debtorSignatureDataUri && <Image src={debtorSignatureDataUri} style={styles.signatureImage} />}
            </View>
            <Text style={styles.partiesLabel}>생년월일</Text>
            <Text style={[styles.partiesValue, styles.partiesValueBirth, styles.readonly]}>
              {contract.debtorBirthDate ?? '-'}
            </Text>
            <Text style={styles.partiesLabel}>주 소</Text>
            <Text style={[styles.partiesValue, styles.partiesValueAddress, styles.readonly]}>
              {contract.debtorAddress ?? '-'}
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          본 서비스가 제공하는 차용증 양식은 일반적인 금전소비대차 계약서 작성 편의를 위한 참고용 문서입니다. 서비스
          제공자는 이용자가 입력한 데이터의 정확성 및 개별 계약 조건에 따른 법적 분쟁에 대해 책임을 지지 않습니다.
          구체적인 법적 조언이나 강제집행력이 필요한 경우 법률 전문가의 상담 또는 공증 절차를 진행하시길 권장합니다.
        </Text>
      </Page>
    </Document>
  );
}
