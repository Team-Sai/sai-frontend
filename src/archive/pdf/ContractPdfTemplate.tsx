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
  PDF_FONT_FAMILY,
  registerPdfFonts,
} from "./fonts";



import { parseArchivedContractTerms } from "./contractTerms";



registerPdfFonts();






function formatAmount(amount: number): string {

  return Number(amount).toLocaleString("ko-KR");

}



const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
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
    marginBottom: 5,
    color: "#9aa3ad",
    fontSize: 7,
    textAlign: "right",
  },

  /* =========================================================
     HEADER
  ========================================================= */

  documentHeader: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 28,
    borderBottomWidth: 1.4,
    borderBottomColor: "#263850",
  },

  title: {
    color: "#111927",
    fontSize: 25,
    fontWeight: 700,
    letterSpacing: 0.8,
    lineHeight: 1.35,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    color: "#87919d",
    fontSize: 8.6,
    lineHeight: 1.65,
    textAlign: "center",
  },

  partySummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },

  partySummaryLabel: {
    marginRight: 5,
    color: "#9aa3ad",
    fontSize: 8,
  },

  partySummaryValue: {
    color: "#202833",
    fontSize: 8.8,
    fontWeight: 700,
  },

  partyDivider: {
    marginHorizontal: 13,
    color: "#dce2e8",
    fontSize: 9,
  },

  /* =========================================================
     일반 조항
  ========================================================= */

  article: {
    paddingTop: 17,
    paddingRight: 5,
    paddingBottom: 18,
    paddingLeft: 5,
    borderBottomWidth: 0.55,
    borderBottomColor: "#dce2e8",
  },

  articleHeading: {
    marginBottom: 10,
    color: "#172437",
    fontSize: 13.2,
    fontWeight: 700,
    lineHeight: 1.55,
  },

  articleText: {
    color: "#303a48",
    fontSize: 10.8,
    fontWeight: 400,
    lineHeight: 2.0,
  },

  value: {
    color: "#087d59",
    fontWeight: 700,
  },

  lineText: {
    marginTop: 6,
  },

  /* =========================================================
     수취 계좌
  ========================================================= */

  accountBox: {
    marginTop: 13,
    paddingTop: 11,
    paddingRight: 12,
    paddingBottom: 11,
    paddingLeft: 12,
    backgroundColor: "#f8faf9",
    borderLeftWidth: 2.2,
    borderLeftColor: "#5b9b80",
  },

  accountDescription: {
    marginBottom: 5,
    color: "#62736b",
    fontSize: 8,
    lineHeight: 1.55,
  },

  accountLabel: {
    marginBottom: 4,
    color: "#62736b",
    fontSize: 7.7,
    fontWeight: 700,
  },

  accountValue: {
    color: "#172437",
    fontSize: 9.2,
    fontWeight: 700,
    lineHeight: 1.55,
  },

  /* =========================================================
     AI 추가 조항
  ========================================================= */

  additionalArticle: {
    paddingTop: 17,
    paddingRight: 5,
    paddingBottom: 18,
    paddingLeft: 5,
    borderBottomWidth: 0.55,
    borderBottomColor: "#dce2e8",
  },

  additionalHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  additionalHeading: {
    color: "#172437",
    fontSize: 13.2,
    fontWeight: 700,
    lineHeight: 1.55,
  },

  additionalText: {
    color: "#303a48",
    fontSize: 10.8,
    fontWeight: 400,
    lineHeight: 2.0,
  },

  /* =========================================================
     체결 문구
  ========================================================= */

  closing: {
    marginTop: 23,
    marginBottom: 17,
    color: "#5f6c79",
    fontSize: 8.5,
    lineHeight: 1.75,
    textAlign: "center",
  },

  /* =========================================================
     당사자 / 서명
  ========================================================= */

  signatures: {
    borderTopWidth: 1.35,
    borderTopColor: "#263850",
    borderBottomWidth: 1.35,
    borderBottomColor: "#263850",
  },

  signatureRow: {
    flexDirection: "row",
    minHeight: 38,
    borderBottomWidth: 0.55,
    borderBottomColor: "#dce2e8",
  },

  signatureRole: {
    width: "9%",
    paddingTop: 11,
    paddingRight: 5,
    paddingBottom: 10,
    paddingLeft: 5,
    color: "#172437",
    backgroundColor: "#fafbfc",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },

  signatureLabel: {
    width: "10%",
    paddingTop: 11,
    paddingRight: 5,
    paddingBottom: 10,
    paddingLeft: 5,
    color: "#87919d",
    fontSize: 7.6,
    textAlign: "center",
  },

  signatureNameValue: {
    position: "relative",
    width: "18%",
    paddingTop: 11,
    paddingRight: 7,
    paddingBottom: 10,
    paddingLeft: 7,
    color: "#172437",
    fontSize: 8,
    fontWeight: 700,
  },

  signatureBirthValue: {
    width: "18%",
    paddingTop: 11,
    paddingRight: 7,
    paddingBottom: 10,
    paddingLeft: 7,
    color: "#303a48",
    fontSize: 7.8,
  },

  signatureAddressValue: {
    width: "35%",
    paddingTop: 11,
    paddingRight: 7,
    paddingBottom: 10,
    paddingLeft: 7,
    color: "#303a48",
    fontSize: 7.8,
    lineHeight: 1.45,
  },

  signatureImage: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 29,
    height: 23,
    objectFit: "contain",
  },

  /* =========================================================
     고지
  ========================================================= */

  disclaimer: {
    marginTop: 13,
    color: "#87919d",
    fontSize: 6.5,
    lineHeight: 1.55,
  },
});



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

    REPAYMENT_METHOD_LABELS[contract.repaymentType] ?? contract.repaymentType;



  const additionalClauses = parseArchivedContractTerms(contract.terms);



  const etcArticleNumber = 6 + additionalClauses.length;



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

            채권자와 채무자 간 금전 대여 및 반환에 관한 계약

          </Text>



          <View style={styles.partySummary}>

            <Text style={styles.partySummaryLabel}>채권자</Text>



            <Text style={styles.partySummaryValue}>

              {contract.creditorName}

            </Text>



            <Text style={styles.partyDivider}>│</Text>



            <Text style={styles.partySummaryLabel}>채무자</Text>



            <Text style={styles.partySummaryValue}>

              {contract.debtorName ?? "-"}

            </Text>

          </View>

        </View>



        {/* =====================

            제1조

        ===================== */}



        <View style={styles.article} wrap={false}>

          <Text style={styles.articleHeading}>제1조 (대여 및 차용)</Text>



          <Text style={styles.articleText}>

            채권자 <Text style={styles.value}>{contract.creditorName}</Text>

            (이하 "갑"이라 한다)는 채무자{" "}

            <Text style={styles.value}>{contract.debtorName ?? "-"}</Text>

            (이하 "을"이라 한다)에게 금{" "}

            <Text style={styles.value}>

              {formatAmount(contract.principalAmount)}

            </Text>

            원을 대여하고, 을은 이를 차용한다.

          </Text>

        </View>



        {/* =====================

            제2조

        ===================== */}



        <View style={styles.article} wrap={false}>

          <Text style={styles.articleHeading}>제2조 (대여기간)</Text>



          <Text style={styles.articleText}>

            본 계약에 따른 대여금의 지급일은{" "}

            <Text style={styles.value}>{contract.startDate}</Text>로 하고, 최종

            변제기일은 <Text style={styles.value}>{contract.maturityDate}</Text>

            로 한다.

          </Text>

        </View>



        {/* =====================

            제3조

        ===================== */}



        <View style={styles.article} wrap={false}>

          <Text style={styles.articleHeading}>제3조 (이자)</Text>



          <Text style={styles.articleText}>

            을은 미상환 원금에 대하여 연{" "}

            <Text style={styles.value}>{contract.interestRate}</Text>

            %의 약정이율에 따른 이자를 지급한다.

          </Text>

        </View>



        {/* =====================

            제4조

        ===================== */}



        <View style={styles.article}>

          <Text style={styles.articleHeading}>제4조 (원금 및 이자의 변제)</Text>



          <Text style={styles.articleText}>

            을은 본 채무를 <Text style={styles.value}>{repaymentLabel}</Text>

            방식으로 변제하며, 정기 상환일은 매월{" "}

            <Text style={styles.value}>{contract.repaymentDay}</Text>

            일로 한다.

          </Text>



          <Text style={[styles.articleText, styles.lineText]}>

            을은 본 계약에 따른 원금 및 이자를 갑이 지정한 계좌로 송금하여

            변제한다.

          </Text>



          {account && (

            <View style={styles.accountBox} wrap={false}>

              <Text style={styles.accountDescription}>변제금 수취 계좌</Text>



              <Text style={styles.accountValue}>

                {account.bankName}

                {" · "}

                {account.maskedAccountNumber}

                {" · 예금주 "}

                {account.accountHolderName}

              </Text>

            </View>

          )}

        </View>



        {/* =====================

            제5조

        ===================== */}



        <View style={styles.article} wrap={false}>

          <Text style={styles.articleHeading}>제5조 (차용 목적)</Text>



          <Text style={styles.articleText}>

            을은 본 대여금을{" "}

            <Text style={styles.value}>{contract.contractAlias}</Text>의

            목적으로 사용한다.

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

              style={styles.additionalArticle}

            >

              <View style={styles.additionalHeadingRow} wrap={false}>

                <Text style={styles.additionalHeading}>

                  제{articleNumber}조 ({clause.title})

                </Text>

              </View>



              <Text style={styles.additionalText}>{clause.content}</Text>

            </View>

          );

        })}



        {/* =====================

            기타사항

        ===================== */}



        <View style={styles.article} wrap={false}>

          <Text style={styles.articleHeading}>

            제{etcArticleNumber}조 (기타사항)

          </Text>



          <Text style={styles.articleText}>

            본 계약에서 정하지 아니한 사항은 당사자 간 합의와 관계 법령에 따라

            처리한다.

          </Text>

        </View>



        {/* =====================

            체결 문구

        ===================== */}



        <Text style={styles.closing}>

          위 계약 내용을 확인하고 당사자는 전자서명을 통하여 계약 체결 의사를

          표시한다.

        </Text>



        {/* =====================

            서명

        ===================== */}



        <View style={styles.signatures}>

          <View style={styles.signatureRow} wrap={false}>

            <Text style={styles.signatureRole}>채권자</Text>



            <Text style={styles.signatureLabel}>성명</Text>



            <View style={styles.signatureNameValue}>

              <Text>{contract.creditorName}</Text>



              {creditorSignatureDataUri && (

                <Image

                  src={creditorSignatureDataUri}

                  style={styles.signatureImage}

                />

              )}

            </View>



            <Text style={styles.signatureLabel}>생년월일</Text>



            <Text style={styles.signatureBirthValue}>

              {contract.creditorBirthDate ?? "-"}

            </Text>



            <Text style={styles.signatureLabel}>주소</Text>



            <Text style={styles.signatureAddressValue}>

              {contract.creditorAddress ?? "-"}

            </Text>

          </View>



          <View style={styles.signatureRow} wrap={false}>

            <Text style={styles.signatureRole}>채무자</Text>



            <Text style={styles.signatureLabel}>성명</Text>



            <View style={styles.signatureNameValue}>

              <Text>{contract.debtorName ?? "-"}</Text>



              {debtorSignatureDataUri && (

                <Image

                  src={debtorSignatureDataUri}

                  style={styles.signatureImage}

                />

              )}

            </View>



            <Text style={styles.signatureLabel}>생년월일</Text>



            <Text style={styles.signatureBirthValue}>

              {contract.debtorBirthDate ?? "-"}

            </Text>



            <Text style={styles.signatureLabel}>주소</Text>



            <Text style={styles.signatureAddressValue}>

              {contract.debtorAddress ?? "-"}

            </Text>

          </View>

        </View>



        <Text style={styles.disclaimer}>

          본 결과는 당사자가 입력하고 확정한 계약 내용을 기반으로

          작성되었습니다. 구체적인 법률관계에 따라 별도 확인이 필요할 수

          있습니다.

        </Text>

      </Page>

    </Document>

  );

}
