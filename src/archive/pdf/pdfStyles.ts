import { StyleSheet } from "@react-pdf/renderer";
import { PDF_SANS_FONT_FAMILY } from "./fonts";

// 정산 내역서·상환 내역서가 함께 쓰는 표 형식 PDF 스타일

export const PDF_COLORS = {
  primary: "#006E2A",
  text: "#1a1a1a",
  muted: "#697080",
  border: "#CFD5E2",
  labelBg: "#f3f4f5",
  theadBg: "#f0f7f2",
  paidBg: "#e6f4ec",
  paidText: "#0b3d2e",
  partialBg: "#fff4e0",
  partialText: "#a66a00",
  unpaidBg: "#fdeee6",
  unpaidText: "#a63d1a",
  neutralBg: "#eef0f3",
  neutralText: "#4b5563",
};

export function formatPdfAmount(amount: number | null | undefined): string {
  return `${Number(amount ?? 0).toLocaleString("ko-KR")}원`;
}

export function formatPdfDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: PDF_SANS_FONT_FAMILY,
    fontSize: 9,
    color: PDF_COLORS.text,
    padding: "12mm 8mm",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    color: PDF_COLORS.primary,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
  },
  ref: {
    flexDirection: "row",
    color: PDF_COLORS.muted,
    fontSize: 8,
  },
  article: {
    marginBottom: 16,
  },
  clause: {
    color: PDF_COLORS.primary,
    fontWeight: 700,
    fontSize: 9.5,
    marginBottom: 6,
  },
  notice: {
    color: PDF_COLORS.muted,
    fontSize: 9,
  },
  noticeArticle: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.75,
    borderTopColor: PDF_COLORS.border,
  },
  noticeList: {
    marginTop: 8,
  },
  noticeListItem: {
    color: PDF_COLORS.muted,
    fontSize: 8,
    lineHeight: 1.6,
    marginBottom: 6,
  },

  infoTable: {
    borderTopWidth: 1.5,
    borderTopColor: PDF_COLORS.primary,
    borderLeftWidth: 0.75,
    borderLeftColor: PDF_COLORS.border,
  },
  row: {
    flexDirection: "row",
  },
  infoLabelCell: {
    width: "20%",
    backgroundColor: PDF_COLORS.labelBg,
    color: PDF_COLORS.muted,
    fontWeight: 700,
    fontSize: 8.5,
    padding: 6,
    borderRightWidth: 0.75,
    borderRightColor: PDF_COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.border,
  },
  infoValueCell: {
    width: "30%",
    backgroundColor: "#ffffff",
    fontSize: 8.5,
    padding: 6,
    borderRightWidth: 0.75,
    borderRightColor: PDF_COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.border,
  },
  infoValueCellWide: {
    width: "80%",
  },
  readonlyValue: {
    color: PDF_COLORS.primary,
    fontWeight: 700,
  },

  dataTable: {
    borderTopWidth: 1.5,
    borderTopColor: PDF_COLORS.primary,
    borderLeftWidth: 0.75,
    borderLeftColor: PDF_COLORS.border,
  },
  dataHeaderCell: {
    backgroundColor: PDF_COLORS.theadBg,
    color: PDF_COLORS.primary,
    fontWeight: 700,
    fontSize: 8,
    padding: 6,
    borderRightWidth: 0.75,
    borderRightColor: PDF_COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.border,
  },
  dataCell: {
    fontSize: 8,
    padding: 6,
    borderRightWidth: 0.75,
    borderRightColor: PDF_COLORS.border,
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.border,
  },
  dataCellAmount: {
    textAlign: "right",
  },
  dataCellEmpty: {
    width: "100%",
    textAlign: "center",
    color: "#999999",
    padding: 12,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontWeight: 700,
  },
});
