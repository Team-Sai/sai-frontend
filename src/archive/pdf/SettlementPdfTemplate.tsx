import { Document, Page, View, Text } from "@react-pdf/renderer";
import { registerPdfFonts } from "./fonts";
import {
  PDF_COLORS,
  formatPdfAmount as formatAmount,
  formatPdfDateTime as formatDateTime,
  pdfStyles as styles,
} from "./pdfStyles";
import {
  DataTableHeader,
  InfoLabel,
  InfoValue,
  type DataColumn,
} from "./PdfTable";
import {
  ARCHIVE_SETTLEMENT_STATUS_LABELS,
  ARCHIVE_SETTLEMENT_TYPE_LABELS,
  SETTLEMENT_SOURCE_TYPE_LABELS,
  SETTLEMENT_SPLIT_TYPE_LABELS,
  type SettlementArchivePreview,
} from "../types/archive";

registerPdfFonts();

const OBLIGATION_STATUS_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  PAID: { bg: PDF_COLORS.paidBg, color: PDF_COLORS.paidText, label: "완납" },
  PARTIALLY_PAID: {
    bg: PDF_COLORS.partialBg,
    color: PDF_COLORS.partialText,
    label: "부분납부",
  },
  UNPAID: { bg: PDF_COLORS.unpaidBg, color: PDF_COLORS.unpaidText, label: "미납" },
};

interface SettlementPdfTemplateProps {
  preview: SettlementArchivePreview;
}

export default function SettlementPdfTemplate({
  preview,
}: SettlementPdfTemplateProps) {
  const generatedAt = new Date();
  const obligationColumns: DataColumn[] = [
    { label: "참여자", width: "25%" },
    { label: "최초 부담금", width: "25%" },
    { label: "현재 납부금", width: "25%" },
    { label: "진행상태", width: "25%" },
  ];
  const historyColumns: DataColumn[] = [
    { label: "일시", width: "18%" },
    { label: "납부자", width: "16%" },
    { label: "승인 금액", width: "16%" },
    { label: "처리방식", width: "16%" },
    { label: "거래 상대방", width: "34%" },
  ];

  return (
    <Document
      title={`정산_${preview.settlementId}`}
      author="사이원장"
      subject="정산 내역서"
      language="ko"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>정 산 내 역 서</Text>
          <View style={styles.ref}>
            <Text>{preview.settlementDisplayId}</Text>
          </View>
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>정산 기본정보</Text>
          <View style={styles.infoTable}>
            <View style={styles.row} wrap={false}>
              <InfoLabel>정산 ID</InfoLabel>
              <InfoValue>{preview.settlementId}</InfoValue>
              <InfoLabel>정산명</InfoLabel>
              <InfoValue>{preview.title}</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>생성자</InfoLabel>
              <InfoValue>{preview.ownerName}</InfoValue>
              <InfoLabel>생성일</InfoLabel>
              <InfoValue>{formatDateTime(preview.createdAt)}</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>유형</InfoLabel>
              <InfoValue>
                {ARCHIVE_SETTLEMENT_TYPE_LABELS[preview.settlementType] ??
                  preview.settlementType}
              </InfoValue>
              <InfoLabel>분담방식</InfoLabel>
              <InfoValue>
                {SETTLEMENT_SPLIT_TYPE_LABELS[preview.splitType] ??
                  preview.splitType}
              </InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>정산상태</InfoLabel>
              <InfoValue>
                {ARCHIVE_SETTLEMENT_STATUS_LABELS[preview.settlementStatus] ??
                  preview.settlementStatus}
              </InfoValue>
              <InfoLabel>마감일</InfoLabel>
              <InfoValue>{preview.dueDate ?? "-"}</InfoValue>
            </View>
          </View>
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>정산 금액 및 이행현황</Text>
          <View style={styles.infoTable}>
            <View style={styles.row} wrap={false}>
              <InfoLabel>총 정산금액</InfoLabel>
              <InfoValue readonly>
                {formatAmount(
                  (preview.ownerAmount ?? 0) +
                    (preview.paymentStatus.totalExpectedAmount ?? 0),
                )}
              </InfoValue>
              <InfoLabel>생성자 부담금</InfoLabel>
              <InfoValue readonly>
                {formatAmount(preview.ownerAmount)}
              </InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>참여자 부담금</InfoLabel>
              <InfoValue readonly>
                {formatAmount(preview.paymentStatus.totalExpectedAmount)}
              </InfoValue>
              <InfoLabel>확인된 납부금</InfoLabel>
              <InfoValue readonly>
                {formatAmount(preview.paymentStatus.totalPaidAmount)}
              </InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>미납금</InfoLabel>
              <InfoValue readonly>
                {formatAmount(preview.paymentStatus.totalRemainingAmount)}
              </InfoValue>
              <InfoLabel>진행률</InfoLabel>
              <InfoValue>{preview.paymentStatus.progressRate ?? 0}%</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>완납</InfoLabel>
              <InfoValue>{preview.paymentStatus.paidCount ?? 0}명</InfoValue>
              <InfoLabel>부분납부 / 미납</InfoLabel>
              <InfoValue>
                {preview.paymentStatus.partiallyPaidCount ?? 0}명 /{" "}
                {preview.paymentStatus.unpaidCount ?? 0}명
              </InfoValue>
            </View>
          </View>
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>수취 계좌</Text>
          {preview.settlementAccount ? (
            <View style={styles.infoTable}>
              <View style={styles.row} wrap={false}>
                <InfoLabel>은행</InfoLabel>
                <InfoValue>{preview.settlementAccount.bankName}</InfoValue>
                <InfoLabel>예금주</InfoLabel>
                <InfoValue>
                  {preview.settlementAccount.accountHolderName}
                </InfoValue>
              </View>
              <View style={styles.row} wrap={false}>
                <InfoLabel>계좌번호</InfoLabel>
                <InfoValue wide>
                  {preview.settlementAccount.maskedAccountNumber}
                </InfoValue>
              </View>
            </View>
          ) : (
            <Text style={styles.notice}>설정된 정산 수취 계좌가 없습니다.</Text>
          )}
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>참여자별 납부 현황</Text>
          <View style={styles.dataTable}>
            <DataTableHeader columns={obligationColumns} />
            {preview.paymentStatus.obligations.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.dataCellEmpty}>
                  참여자 납부 내역이 없습니다.
                </Text>
              </View>
            ) : (
              preview.paymentStatus.obligations.map((obligation) => {
                const badge =
                  OBLIGATION_STATUS_BADGE[obligation.paymentStatus] ??
                  OBLIGATION_STATUS_BADGE.UNPAID;
                return (
                  <View
                    key={obligation.paymentObligationId}
                    style={styles.row}
                    wrap={false}
                  >
                    <Text style={[styles.dataCell, { width: "25%" }]}>
                      {obligation.participantName}
                    </Text>
                    <Text
                      style={[
                        styles.dataCell,
                        styles.dataCellAmount,
                        { width: "25%" },
                      ]}
                    >
                      {formatAmount(obligation.expectedAmount)}
                    </Text>
                    <Text
                      style={[
                        styles.dataCell,
                        styles.dataCellAmount,
                        { width: "25%" },
                      ]}
                    >
                      {formatAmount(obligation.paidAmount)}
                    </Text>
                    <View style={[styles.dataCell, { width: "25%" }]}>
                      <Text
                        style={[
                          styles.badge,
                          { backgroundColor: badge.bg, color: badge.color },
                        ]}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>상세 납부 및 계좌 거래 내역</Text>
          <View style={styles.dataTable}>
            <DataTableHeader columns={historyColumns} />
            {preview.paymentHistory.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.dataCellEmpty}>
                  확인된 납부·거래 내역이 없습니다.
                </Text>
              </View>
            ) : (
              preview.paymentHistory.map((record) => (
                <View
                  key={record.paymentRecordId}
                  style={styles.row}
                  wrap={false}
                >
                  <Text style={[styles.dataCell, { width: "18%" }]}>
                    {formatDateTime(record.recordedAt)}
                  </Text>
                  <Text style={[styles.dataCell, { width: "16%" }]}>
                    {record.payerName}
                  </Text>
                  <Text
                    style={[
                      styles.dataCell,
                      styles.dataCellAmount,
                      { width: "16%" },
                    ]}
                  >
                    {formatAmount(record.amount)}
                  </Text>
                  <Text style={[styles.dataCell, { width: "16%" }]}>
                    {SETTLEMENT_SOURCE_TYPE_LABELS[record.sourceType] ?? "수동"}
                  </Text>
                  <Text style={[styles.dataCell, { width: "34%" }]}>
                    {record.counterpartyName ?? "-"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[styles.article, styles.noticeArticle]}>
          <Text style={styles.clause}>[기록 검증 및 유의사항]</Text>
          <View style={styles.infoTable}>
            <View style={styles.row} wrap={false}>
              <InfoLabel>기록 생성일시</InfoLabel>
              <InfoValue>{formatDateTime(generatedAt.toISOString())}</InfoValue>
              <InfoLabel>사이원장 정산 ID</InfoLabel>
              <InfoValue>{preview.settlementDisplayId}</InfoValue>
            </View>
          </View>

          <View style={styles.noticeList}>
            <Text style={styles.noticeListItem}>
              본 기록은 사이원장 서비스에 저장된 정산 정보와 연결된 거래·납부
              이력을 기록 생성 시점을 기준으로 정리한 자료입니다. 당사자 간
              법률관계 또는 채무의 존재를 확정하거나 법적 효력을 보증하는 문서는
              아닙니다.
            </Text>
            <Text style={styles.noticeListItem}>
              계좌거래 자동매칭 항목은 사이원장에 연동된 거래정보를 기준으로
              해당 정산의 납부기록과 연결된 내역입니다. 위 상세 납부 및 계좌
              거래 내역 표에서 처리방식이 "자동매칭"으로 표시된 항목이 이에
              해당합니다.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
