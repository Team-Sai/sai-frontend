import { Document, Page, Text, View } from "@react-pdf/renderer";
import { REPAYMENT_METHOD_LABELS } from "../../contract/types/contract";
import {
  SCHEDULE_STATUS_LABELS,
  type RepaymentScheduleRow,
} from "../../contract/types/schedule";
import { registerPdfFonts } from "./fonts";
import {
  PDF_COLORS,
  formatPdfAmount as formatAmount,
  formatPdfDateTime as formatDateTime,
  pdfStyles as styles,
} from "./pdfStyles";
import { DataTableHeader, InfoLabel, InfoValue, type DataColumn } from "./PdfTable";
import type { RepaymentHistory } from "./repaymentHistory";

registerPdfFonts();

const STATUS_BADGE_COLORS: Record<RepaymentScheduleRow["status"], { bg: string; color: string }> = {
  PAID: { bg: PDF_COLORS.paidBg, color: PDF_COLORS.paidText },
  PENDING: { bg: PDF_COLORS.neutralBg, color: PDF_COLORS.neutralText },
  OVERDUE: { bg: PDF_COLORS.unpaidBg, color: PDF_COLORS.unpaidText },
  WRITTEN_OFF: { bg: PDF_COLORS.neutralBg, color: PDF_COLORS.neutralText },
};

// 상환 스케줄 화면(SchedulePage)과 같은 기준으로 상태를 표시한다.
function getStatusBadge(row: RepaymentScheduleRow) {
  if (row.status === "PENDING" && (row.paidAmount ?? 0) > 0) {
    return { bg: PDF_COLORS.partialBg, color: PDF_COLORS.partialText, label: "부분납부" };
  }
  return { ...STATUS_BADGE_COLORS[row.status], label: SCHEDULE_STATUS_LABELS[row.status] };
}

function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10).replaceAll("-", ".") : "-";
}

function versionLabel(index: number): string {
  return index === 0 ? "최초 계약" : `${index}차 변경 계약`;
}

const SCHEDULE_COLUMNS: DataColumn[] = [
  { label: "회차", width: "14%" },
  { label: "상환 예정일", width: "15%" },
  { label: "상환 금액", width: "17%" },
  { label: "입금액", width: "17%" },
  { label: "입금일", width: "19%" },
  { label: "상태", width: "18%" },
];

const VERSION_COLUMNS: DataColumn[] = [
  { label: "구분", width: "16%" },
  { label: "작성일", width: "14%" },
  { label: "원금", width: "18%" },
  { label: "이자율", width: "10%" },
  { label: "상환방식", width: "16%" },
  { label: "만기일", width: "14%" },
  { label: "정기 상환일", width: "12%" },
];

const EARLY_REPAYMENT_COLUMNS: DataColumn[] = [
  { label: "처리일시", width: "30%" },
  { label: "적용 계약", width: "35%" },
  { label: "상환액", width: "35%" },
];

interface RepaymentPdfTemplateProps {
  history: RepaymentHistory;
}

export default function RepaymentPdfTemplate({ history }: RepaymentPdfTemplateProps) {
  const generatedAt = new Date();
  const { versions, current, totalPaidAmount } = history;
  const first = versions[0];
  const currentContract = current.contract;
  const displayId = current.summary.contractDisplayId ?? currentContract.contractDisplayId ?? "-";

  const earlyRepayments = versions
    .flatMap((version, index) =>
      (version.summary.earlyRepayments ?? []).map((early) => ({
        ...early,
        versionIndex: index,
      })),
    )
    .sort((a, b) => a.processedAt.localeCompare(b.processedAt));

  return (
    <Document
      title={`상환내역_${currentContract.contractId}`}
      author="사이원장"
      subject="상환 내역서"
      language="ko"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>상 환 내 역 서</Text>
          <View style={styles.ref}>
            <Text>{displayId}</Text>
          </View>
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>차용증 기본정보</Text>
          <View style={styles.infoTable}>
            <View style={styles.row} wrap={false}>
              <InfoLabel>차용증 ID</InfoLabel>
              <InfoValue>{displayId}</InfoValue>
              <InfoLabel>계약명</InfoLabel>
              <InfoValue>{currentContract.contractAlias || "-"}</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>채권자</InfoLabel>
              <InfoValue>{current.summary.creditorName || "-"}</InfoValue>
              <InfoLabel>채무자</InfoLabel>
              <InfoValue>{current.summary.debtorName || "-"}</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>최초 원금</InfoLabel>
              <InfoValue readonly>{formatAmount(first.contract.principalAmount)}</InfoValue>
              <InfoLabel>대여일</InfoLabel>
              <InfoValue>{formatDate(first.contract.startDate)}</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>현재 이자율</InfoLabel>
              <InfoValue>연 {currentContract.interestRate}%</InfoValue>
              <InfoLabel>상환방식</InfoLabel>
              <InfoValue>
                {REPAYMENT_METHOD_LABELS[currentContract.repaymentType] ?? "-"}
              </InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>만기일</InfoLabel>
              <InfoValue>{formatDate(currentContract.maturityDate)}</InfoValue>
              <InfoLabel>계약 변경</InfoLabel>
              <InfoValue>{versions.length > 1 ? `${versions.length - 1}회` : "없음"}</InfoValue>
            </View>
          </View>
        </View>

        <View style={styles.article}>
          <Text style={styles.clause}>상환 현황</Text>
          <View style={styles.infoTable}>
            <View style={styles.row} wrap={false}>
              <InfoLabel>누적 상환액</InfoLabel>
              <InfoValue readonly>{formatAmount(totalPaidAmount)}</InfoValue>
              <InfoLabel>남은 상환액</InfoLabel>
              <InfoValue readonly>{formatAmount(current.summary.remainingAmount)}</InfoValue>
            </View>
            <View style={styles.row} wrap={false}>
              <InfoLabel>다음 상환일</InfoLabel>
              <InfoValue>{formatDate(current.summary.nextDueDate)}</InfoValue>
              <InfoLabel>현재 계약 진행</InfoLabel>
              <InfoValue>
                {current.summary.paidCount} / {current.summary.totalCount}회차 납부
              </InfoValue>
            </View>
          </View>
        </View>

        {versions.length > 1 && (
          <View style={styles.article}>
            <Text style={styles.clause}>계약 변경 이력</Text>
            <View style={styles.dataTable}>
              <DataTableHeader columns={VERSION_COLUMNS} />
              {versions.map(({ contract }, index) => (
                <View key={contract.contractId} style={styles.row} wrap={false}>
                  <Text style={[styles.dataCell, { width: "16%" }]}>
                    {versionLabel(index)}
                    {index === versions.length - 1 ? " (현재)" : ""}
                  </Text>
                  <Text style={[styles.dataCell, { width: "14%" }]}>
                    {formatDate(contract.createdAt)}
                  </Text>
                  <Text style={[styles.dataCell, styles.dataCellAmount, { width: "18%" }]}>
                    {formatAmount(contract.principalAmount)}
                  </Text>
                  <Text style={[styles.dataCell, { width: "10%" }]}>
                    {contract.interestRate}%
                  </Text>
                  <Text style={[styles.dataCell, { width: "16%" }]}>
                    {REPAYMENT_METHOD_LABELS[contract.repaymentType] ?? "-"}
                  </Text>
                  <Text style={[styles.dataCell, { width: "14%" }]}>
                    {formatDate(contract.maturityDate)}
                  </Text>
                  <Text style={[styles.dataCell, { width: "12%" }]}>
                    매월 {contract.repaymentDay}일
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {versions.map(({ contract, summary }, index) => (
          <View key={contract.contractId} style={styles.article}>
            <Text style={styles.clause}>
              {versions.length > 1
                ? `회차별 상환 내역 · ${versionLabel(index)}${index === versions.length - 1 ? " (현재)" : ""}`
                : "회차별 상환 내역"}
            </Text>
            <View style={styles.dataTable}>
              <DataTableHeader columns={SCHEDULE_COLUMNS} />
              {summary.schedules.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.dataCellEmpty}>등록된 상환 스케줄이 없습니다.</Text>
                </View>
              ) : (
                summary.schedules.map((row) => {
                  const badge = getStatusBadge(row);
                  return (
                    <View key={row.scheduleId} style={styles.row} wrap={false}>
                      <Text style={[styles.dataCell, { width: "14%" }]}>
                        {row.earlyPayoff ? "중도상환(전액)" : `${row.sequence}회차`}
                      </Text>
                      <Text style={[styles.dataCell, { width: "15%" }]}>
                        {formatDate(row.dueDate)}
                      </Text>
                      <Text style={[styles.dataCell, styles.dataCellAmount, { width: "17%" }]}>
                        {formatAmount(row.totalPaymentDue)}
                      </Text>
                      <Text style={[styles.dataCell, styles.dataCellAmount, { width: "17%" }]}>
                        {(row.paidAmount ?? 0) > 0 ? formatAmount(row.paidAmount) : "-"}
                      </Text>
                      <Text style={[styles.dataCell, { width: "19%" }]}>
                        {formatDateTime(row.paidAt)}
                      </Text>
                      <View style={[styles.dataCell, { width: "18%" }]}>
                        <Text style={[styles.badge, { backgroundColor: badge.bg, color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        ))}

        <View style={styles.article}>
          <Text style={styles.clause}>중도상환 내역</Text>
          <View style={styles.dataTable}>
            <DataTableHeader columns={EARLY_REPAYMENT_COLUMNS} />
            {earlyRepayments.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.dataCellEmpty}>중도상환 내역이 없습니다.</Text>
              </View>
            ) : (
              earlyRepayments.map((early) => (
                <View key={early.earlyRepaymentId} style={styles.row} wrap={false}>
                  <Text style={[styles.dataCell, { width: "30%" }]}>
                    {formatDateTime(early.processedAt)}
                  </Text>
                  <Text style={[styles.dataCell, { width: "35%" }]}>
                    {versionLabel(early.versionIndex)}
                  </Text>
                  <Text style={[styles.dataCell, styles.dataCellAmount, { width: "35%" }]}>
                    {formatAmount(early.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[styles.article, styles.noticeArticle]} wrap={false}>
          <Text style={styles.clause}>[기록 검증 및 유의사항]</Text>
          <View style={styles.infoTable}>
            <View style={styles.row} wrap={false}>
              <InfoLabel>기록 생성일시</InfoLabel>
              <InfoValue>{formatDateTime(generatedAt.toISOString())}</InfoValue>
              <InfoLabel>사이원장 차용증 ID</InfoLabel>
              <InfoValue>{displayId}</InfoValue>
            </View>
          </View>

          <View style={styles.noticeList}>
            <Text style={styles.noticeListItem}>
              본 기록은 사이원장 서비스에 저장된 차용증의 상환 스케줄과 확인된 입금 이력을
              기록 생성 시점을 기준으로 정리한 자료입니다. 당사자 간 법률관계 또는 채무의
              존재를 확정하거나 법적 효력을 보증하는 문서는 아닙니다.
            </Text>
            <Text style={styles.noticeListItem}>
              계약 조건이 변경된 경우 변경 전 계약에서 납부한 회차와 변경 후 계약의 회차를
              계약별로 구분하여 표시하며, 누적 상환액은 모든 계약의 상환액(중도상환 포함)을
              합산한 금액입니다.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
