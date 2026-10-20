import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { LinkedBankAccount } from "../../accounts/types/account";

import {
  REPAYMENT_METHOD_LABELS,
  type LoanContractResponse,
} from "../../contract/types/contract";

import {
  PDF_SANS_FONT_FAMILY,
  PDF_SERIF_FONT_FAMILY,
  registerPdfFonts,
} from "./fonts";

import { parseArchivedContractTerms } from "./contractTerms";

registerPdfFonts();

const EMPTY_DEBTOR_NAME = "상대방 확인 단계에서 확정";

function formatAmount(amount: number): string {
  return Number(amount).toLocaleString("ko-KR");
}

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_SERIF_FONT_FAMILY,
    color: "#202833",
    backgroundColor: "#ffffff",
    paddingTop: "13mm",
    paddingRight: "13mm",
    paddingBottom: "14mm",
    paddingLeft: "13mm",
  },

  /* =========================================================
     상단 문서 번호
  ========================================================= */

  contractNumber: {
    marginBottom: 4,
    color: "#9aa3ad",
    fontFamily: PDF_SANS_FONT_FAMILY,
    fontSize: 7,
    textAlign: "right",
  },

  /* =========================================================
     HEADER
  ========================================================= */

  documentHeader: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 24,
    borderBottomWidth: 1.4,
    borderBottomColor: "#25354b",
  },

  title: {
    color: "#111927",
    fontSize: 21,
    fontWeight: 700,
    letterSpacing: 2.3,
    lineHeight: 1.45,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    color: "#87919d",
    fontSize: 8,
    lineHeight: 1.7,
    textAlign: "center",
  },

  partyLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    fontFamily: PDF_SANS_FONT_FAMILY,
  },

  partyLineLabel: {
    marginRight: 5,
    color: "#929ca8",
    fontSize: 7.5,
  },

  partyLineValue: {
    color: "#25313e",
    fontSize: 7.5,
    fontWeight: 700,
  },

  partyLineDivider: {
    width: 0.6,
    height: 8,
    marginHorizontal: 11,
    backgroundColor: "#d9dee5",
  },

  /* =========================================================
     조항
  ========================================================= */

  article: {
    paddingTop: 17,
    paddingRight: 3,
    paddingBottom: 17,
    paddingLeft: 3,
    borderBottomWidth: 0.6,
    borderBottomColor: "#e3e7ec",
  },

  lastArticle: {
    borderBottomWidth: 0,
  },

  articleHeading: {
    marginBottom: 9,
    color: "#132035",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.55,
  },

  articleHeadingTitle: {
    fontSize: 11.4,
  },

  articleText: {
    color: "#303a48",
    fontSize: 10.8,
    fontWeight: 400,
    lineHeight: 2.05,
  },

  value: {
    color: "#087d59",
    fontWeight: 700,
    textDecoration: "underline",
    textDecorationColor: "#a7b8b0",
  },

  /* =========================================================
     제4조 계좌 문구
  ========================================================= */

  accountNotice: {
    marginTop: 13,
    paddingTop: 11,
    paddingRight: 11,
    paddingBottom: 11,
    paddingLeft: 11,
    backgroundColor: "#f8faf9",
    borderLeftWidth: 2,
    borderLeftColor: "#5b8f78",
  },

  accountNoticeText: {
    color: "#56675f",
    fontSize: 7.6,
    lineHeight: 1.8,
  },

  /* =========================================================
     맺음말
  ========================================================= */

  closing: {
    paddingTop: 16,
    paddingBottom: 9,
    borderTopWidth: 0.6,
    borderTopColor: "#dfe5ec",
    color: "#25364c",
    fontSize: 10,
    lineHeight: 1.75,
  },

  /* =========================================================
     당사자표
  ========================================================= */

  parties: {
    borderTopWidth: 1.3,
    borderTopColor: "#2a3c55",
    borderBottomWidth: 1.3,
    borderBottomColor: "#2a3c55",
  },

  partiesRow: {
    flexDirection: "row",
  },

  partiesRowDivider: {
    borderTopWidth: 0.6,
    borderTopColor: "#dbe2ea",
  },

  partiesCell: {
    justifyContent: "center",
    paddingTop: 8,
    paddingRight: 7,
    paddingBottom: 8,
    paddingLeft: 7,
    borderLeftWidth: 0.6,
    borderLeftColor: "#dbe2ea",
  },

  partiesFirstCell: {
    borderLeftWidth: 0,
  },

  partiesRole: {
    color: "#27384e",
    fontSize: 8.2,
    fontWeight: 700,
    textAlign: "center",
  },

  partiesLabel: {
    color: "#788397",
    fontSize: 7.6,
    fontWeight: 700,
    letterSpacing: 0.6,
    textAlign: "center",
  },

  partiesValue: {
    color: "#17283f",
    fontSize: 8.2,
    fontWeight: 700,
    lineHeight: 1.45,
  },

  /* =========================================================
     전자서명
  ========================================================= */

  signatures: {
    flexDirection: "row",
    marginTop: 24,
    paddingTop: 17,
    paddingBottom: 22,
    borderTopWidth: 0.6,
    borderTopColor: "#dfe5ec",
    fontFamily: PDF_SANS_FONT_FAMILY,
  },

  signatureItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 75,
  },

  signatureItemGap: {
    marginLeft: 20,
  },

  signatureLabel: {
    marginBottom: 6,
    color: "#7a8697",
    fontSize: 7.6,
    fontWeight: 700,
  },

  signatureEmpty: {
    color: "#1f3046",
    fontSize: 8.8,
    fontWeight: 700,
  },

  signatureImage: {
    maxWidth: 113,
    maxHeight: 52,
    objectFit: "contain",
  },

  /* =========================================================
     수취 계좌
  ========================================================= */

  account: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingRight: 11,
    paddingBottom: 10,
    paddingLeft: 11,
    borderWidth: 0.6,
    borderColor: "#e1e8e4",
    borderRadius: 4,
    backgroundColor: "#f8fbf9",
    fontFamily: PDF_SANS_FONT_FAMILY,
  },

  accountLabel: {
    marginRight: 9,
    color: "#78877e",
    fontSize: 7.6,
    fontWeight: 700,
  },

  accountValue: {
    color: "#18372d",
    fontSize: 8.8,
    fontWeight: 700,
  },

  accountHolder: {
    marginLeft: "auto",
    color: "#6e7d74",
    fontSize: 7.6,
  },

  /* =========================================================
     고지
  ========================================================= */

  disclaimer: {
    marginTop: 12,
    color: "#737d8c",
    fontFamily: PDF_SANS_FONT_FAMILY,
    fontSize: 7,
    lineHeight: 1.6,
  },
});

const PARTY_COLUMN_WIDTHS = ["9%", "9%", "14%", "11%", "14%", "7%", "36%"];

interface PartyRowProps {
  role: string;
  name: string;
  birthDate: string;
  address: string;
  isFirst: boolean;
}

function PartyRow({ role, name, birthDate, address, isFirst }: PartyRowProps) {
  const cells = [
    { text: role, style: styles.partiesRole, background: "#f7f9fb" },
    { text: "성 명", style: styles.partiesLabel, background: "#fafbfd" },
    { text: name, style: styles.partiesValue, background: "#ffffff" },
    { text: "생년월일", style: styles.partiesLabel, background: "#fafbfd" },
    { text: birthDate, style: styles.partiesValue, background: "#ffffff" },
    { text: "주 소", style: styles.partiesLabel, background: "#fafbfd" },
    { text: address, style: styles.partiesValue, background: "#ffffff" },
  ];

  return (
    <View
      style={[styles.partiesRow, ...(isFirst ? [] : [styles.partiesRowDivider])]}
      wrap={false}
    >
      {cells.map((cell, index) => (
        <View
          key={index}
          style={[
            styles.partiesCell,
            ...(index === 0 ? [styles.partiesFirstCell] : []),
            {
              width: PARTY_COLUMN_WIDTHS[index],
              backgroundColor: cell.background,
            },
          ]}
        >
          <Text style={cell.style}>{cell.text}</Text>
        </View>
      ))}
    </View>
  );
}

interface ContractPdfTemplateProps {
  contract: LoanContractResponse;

  account?: LinkedBankAccount | null;

  creditorSignatureDataUri?: string | null;

  debtorSignatureDataUri?: string | null;
}

export default function ContractPdfTemplate({
  contract,
  account = null,
  creditorSignatureDataUri,
  debtorSignatureDataUri,
}: ContractPdfTemplateProps) {
  const repaymentLabel =
    REPAYMENT_METHOD_LABELS[contract.repaymentType] ?? "-";

  const additionalClauses = parseArchivedContractTerms(contract.terms);

  const etcArticleNumber = 6 + additionalClauses.length;

  const creditorName = contract.creditorName ?? "-";

  const debtorName = contract.debtorName?.trim() || EMPTY_DEBTOR_NAME;

  const hasSignature = Boolean(
    creditorSignatureDataUri || debtorSignatureDataUri,
  );

  return (
    <Document
      title={`차용증_${contract.contractId}`}
      author="사이원장"
      subject="금전소비대차계약서"
      language="ko"
    >
      <Page size="A4" style={styles.page}>
        {contract.contractDisplayId && (
          <Text style={styles.contractNumber}>
            {contract.contractDisplayId}
          </Text>
        )}

        {/* =====================
            HEADER
        ===================== */}

        <View style={styles.documentHeader}>
          <Text style={styles.title}>금전소비대차계약서</Text>

          <Text style={styles.subtitle}>
            금전의 대여 및 반환에 관한 당사자 간 계약
          </Text>

          <View style={styles.partyLine}>
            <Text style={styles.partyLineLabel}>채권자</Text>

            <Text style={styles.partyLineValue}>{creditorName}</Text>

            <View style={styles.partyLineDivider} />

            <Text style={styles.partyLineLabel}>채무자</Text>

            <Text style={styles.partyLineValue}>{debtorName}</Text>
          </View>
        </View>

        {/* =====================
            제1조
        ===================== */}

        <View style={styles.article} wrap={false}>
          <Text style={styles.articleHeading}>
            제1조 <Text style={styles.articleHeadingTitle}>(대여 및 차용)</Text>
          </Text>

          <Text style={styles.articleText}>
            채권자 <Text style={styles.value}> {creditorName} </Text>
            (이하 "갑"이라 한다)는 채무자{" "}
            <Text style={styles.value}> {debtorName} </Text>
            (이하 "을"이라 한다)에게 금
            <Text style={styles.value}>
              {" "}
              {contract.principalAmount
                ? formatAmount(contract.principalAmount)
                : "-"}{" "}
            </Text>
            원을 대여하고, 을은 이를 차용한다.
          </Text>
        </View>

        {/* =====================
            제2조
        ===================== */}

        <View style={styles.article} wrap={false}>
          <Text style={styles.articleHeading}>
            제2조 <Text style={styles.articleHeadingTitle}>(대여기간)</Text>
          </Text>

          <Text style={styles.articleText}>
            본 계약에 따른 대여금의 지급일은
            <Text style={styles.value}> {contract.startDate || "-"} </Text>
            로 하고, 최종 변제기일은
            <Text style={styles.value}> {contract.maturityDate || "-"} </Text>
            로 한다.
          </Text>
        </View>

        {/* =====================
            제3조
        ===================== */}

        <View style={styles.article} wrap={false}>
          <Text style={styles.articleHeading}>
            제3조 <Text style={styles.articleHeadingTitle}>(이자)</Text>
          </Text>

          <Text style={styles.articleText}>
            을은 미상환 원금에 대하여 연
            <Text style={styles.value}> {contract.interestRate ?? "-"} </Text>
            %의 약정이율에 따른 이자를 지급한다.
          </Text>
        </View>

        {/* =====================
            제4조
        ===================== */}

        <View style={styles.article} wrap={false}>
          <Text style={styles.articleHeading}>
            제4조{" "}
            <Text style={styles.articleHeadingTitle}>
              (원금 및 이자의 변제)
            </Text>
          </Text>

          <Text style={styles.articleText}>
            을은 본 채무를
            <Text style={styles.value}> {repaymentLabel} </Text>
            방식으로 변제하며, 정기 상환일은 매월
            <Text style={styles.value}> {contract.repaymentDay ?? "-"} </Text>
            일로 한다.
          </Text>

          <View style={styles.accountNotice}>
            <Text style={styles.accountNoticeText}>
              을은 본 계약에 따른 원금 및 이자를 갑이 지정한 계좌로 송금하여
              변제한다.
            </Text>
          </View>
        </View>

        {/* =====================
            제5조
        ===================== */}

        <View style={styles.article} wrap={false}>
          <Text style={styles.articleHeading}>
            제5조 <Text style={styles.articleHeadingTitle}>(차용 목적)</Text>
          </Text>

          <Text style={styles.articleText}>
            을은 본 대여금을
            <Text style={styles.value}> {contract.contractAlias || "-"} </Text>
            의 목적으로 사용한다.
          </Text>
        </View>

        {/* =====================
            S-AI 추가 조항
        ===================== */}

        {additionalClauses.map((clause, index) => {
          const articleNumber = 6 + index;

          return (
            <View
              key={`${articleNumber}-${clause.title}`}
              style={styles.article}
            >
              <Text style={styles.articleHeading} minPresenceAhead={40}>
                제{articleNumber}조{" "}
                <Text style={styles.articleHeadingTitle}>({clause.title})</Text>
              </Text>

              <Text style={styles.articleText}>{clause.content}</Text>
            </View>
          );
        })}

        {/* =====================
            기타사항
        ===================== */}

        <View style={[styles.article, styles.lastArticle]} wrap={false}>
          <Text style={styles.articleHeading}>
            제{etcArticleNumber}조{" "}
            <Text style={styles.articleHeadingTitle}>(기타사항)</Text>
          </Text>

          <Text style={styles.articleText}>
            본 계약에서 정하지 아니한 사항은 당사자 간 합의와 관계 법령에 따라
            처리한다.
          </Text>
        </View>

        {/* =====================
            맺음말 + 당사자표
        ===================== */}

        <View wrap={false}>
          <Text style={styles.closing}>
            갑과 을은 상기 계약을 증명하기 위하여 본 계약서 2통을 작성하고, 각자
            서명 날인한 후 1통씩을 보관한다.
          </Text>

          <View style={styles.parties}>
            <PartyRow
              role="채권자"
              name={creditorName}
              birthDate={contract.creditorBirthDate ?? "-"}
              address={contract.creditorAddress || "-"}
              isFirst
            />

            <PartyRow
              role="채무자"
              name={contract.debtorName ?? "-"}
              birthDate={contract.debtorBirthDate ?? "-"}
              address={contract.debtorAddress || "-"}
              isFirst={false}
            />
          </View>
        </View>

        {/* =====================
            전자서명
        ===================== */}

        {hasSignature && (
          <View style={styles.signatures} wrap={false}>
            <View style={styles.signatureItem}>
              <Text style={styles.signatureLabel}>채권자 전자서명</Text>

              {creditorSignatureDataUri ? (
                <Image
                  src={creditorSignatureDataUri}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={styles.signatureEmpty}>서명 없음</Text>
              )}
            </View>

            <View style={[styles.signatureItem, styles.signatureItemGap]}>
              <Text style={styles.signatureLabel}>채무자 전자서명</Text>

              {debtorSignatureDataUri ? (
                <Image
                  src={debtorSignatureDataUri}
                  style={styles.signatureImage}
                />
              ) : (
                <Text style={styles.signatureEmpty}>서명 없음</Text>
              )}
            </View>
          </View>
        )}

        {/* =====================
            수취 계좌
        ===================== */}

        {account && (
          <View
            style={[styles.account, ...(hasSignature ? [] : [{ marginTop: 24 }])]}
            wrap={false}
          >
            <Text style={styles.accountLabel}>변제금 수취 계좌</Text>

            <Text style={styles.accountValue}>
              {account.bankName}
              {" · "}
              {account.maskedAccountNumber}
            </Text>

            <Text style={styles.accountHolder}>
              예금주 {account.accountHolderName}
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          * 본 계약서는 당사자가 입력하고 확정한 계약 내용을 기반으로
          작성·보관된 문서입니다. 구체적인 법률관계에 따라 별도의 확인이 필요할
          수 있습니다.
        </Text>
      </Page>
    </Document>
  );
}
