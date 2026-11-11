import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfStyles } from "./pdfStyles";

export function InfoLabel({ children }: { children: ReactNode }) {
  return <Text style={pdfStyles.infoLabelCell}>{children}</Text>;
}

export function InfoValue({
  children,
  readonly,
  wide,
}: {
  children: ReactNode;
  readonly?: boolean;
  wide?: boolean;
}) {
  return (
    <Text
      style={[
        pdfStyles.infoValueCell,
        wide ? pdfStyles.infoValueCellWide : undefined,
        readonly ? pdfStyles.readonlyValue : undefined,
      ]}
    >
      {children}
    </Text>
  );
}

export interface DataColumn {
  label: string;
  width: string;
}

export function DataTableHeader({ columns }: { columns: DataColumn[] }) {
  return (
    <View style={pdfStyles.row} wrap={false}>
      {columns.map((col) => (
        <Text
          key={col.label}
          style={[pdfStyles.dataHeaderCell, { width: col.width }]}
        >
          {col.label}
        </Text>
      ))}
    </View>
  );
}
