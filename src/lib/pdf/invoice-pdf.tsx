import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Invoice, Preferences } from "@/lib/db/schema";
import { formatCents, formatDate, formatMonth, formatQuantity } from "@/lib/format";

export type InvoiceLine = {
  date: string;
  name: string;
  description: string;
  type: "course" | "expense";
  unitName: string;
  quantity: number;
  rateCents: number;
  totalCents: number;
};

export type InvoicePdfData = {
  invoice: Invoice;
  prefs: Preferences;
  lines: InvoiceLine[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  senderLine: {
    fontSize: 7,
    color: "#666",
    marginBottom: 6,
    textDecoration: "underline",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  recipient: { width: "55%" },
  contact: { width: "40%", textAlign: "right", color: "#444", fontSize: 9 },
  title: { marginTop: 36, fontSize: 14, fontFamily: "Helvetica-Bold" },
  meta: { marginTop: 8, color: "#444" },
  table: { marginTop: 24 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 5,
  },
  colDate: { width: "13%" },
  colName: { width: "37%" },
  colQty: { width: "17%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  description: { color: "#666", fontSize: 8, marginTop: 1 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  totalLabel: { fontFamily: "Helvetica-Bold", marginRight: 24 },
  totalValue: { fontFamily: "Helvetica-Bold" },
  note: { marginTop: 24, color: "#444" },
  payment: { marginTop: 12 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: "#999",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#666",
    textAlign: "center",
  },
});

export function InvoicePdf({ invoice, prefs, lines }: InvoicePdfData) {
  const currency = prefs.currency;
  const senderShort = [prefs.businessName || prefs.name, prefs.address]
    .filter(Boolean)
    .join(" · ")
    .replace(/\n/g, ", ");

  const footerParts = [
    prefs.businessName || prefs.name,
    prefs.phone && `Tel. ${prefs.phone}`,
    prefs.email,
    prefs.iban && `IBAN ${prefs.iban}`,
  ].filter(Boolean);

  return (
    <Document
      title={`Rechnung ${invoice.number}`}
      author={prefs.businessName || prefs.name}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.senderLine}>{senderShort}</Text>

        <View style={styles.headerRow}>
          <View style={styles.recipient}>
            <Text>{invoice.customerLegalName}</Text>
            {invoice.customerAddressee ? (
              <Text>{invoice.customerAddressee}</Text>
            ) : null}
            {invoice.customerAddress
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
          </View>
          <View style={styles.contact}>
            {prefs.businessName ? <Text>{prefs.businessName}</Text> : null}
            <Text>{prefs.name}</Text>
            {prefs.address
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            {prefs.phone ? <Text>Tel. {prefs.phone}</Text> : null}
            {prefs.email ? <Text>{prefs.email}</Text> : null}
          </View>
        </View>

        <Text style={styles.title}>Rechnung Nr. {invoice.number}</Text>
        <Text style={styles.meta}>
          Rechnungsdatum: {formatDate(invoice.issueDate)}
        </Text>
        <Text style={styles.meta}>
          Leistungszeitraum: {formatMonth(invoice.year, invoice.month)}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Datum</Text>
            <Text style={styles.colName}>Leistung</Text>
            <Text style={styles.colQty}>Anzahl</Text>
            <Text style={styles.colRate}>Satz</Text>
            <Text style={styles.colTotal}>Betrag</Text>
          </View>
          {lines.map((line, i) => (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={styles.colDate}>{formatDate(line.date)}</Text>
              <View style={styles.colName}>
                <Text>
                  {line.type === "expense" ? "Auslage: " : ""}
                  {line.name}
                </Text>
                {line.description ? (
                  <Text style={styles.description}>{line.description}</Text>
                ) : null}
              </View>
              <Text style={styles.colQty}>
                {formatQuantity(line.quantity)} {line.unitName}
              </Text>
              <Text style={styles.colRate}>
                {formatCents(line.rateCents, currency)}
              </Text>
              <Text style={styles.colTotal}>
                {formatCents(line.totalCents, currency)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gesamtbetrag</Text>
            <Text style={styles.totalValue}>
              {formatCents(invoice.totalCents, currency)}
            </Text>
          </View>
        </View>

        {prefs.vatNote ? <Text style={styles.note}>{prefs.vatNote}</Text> : null}

        <Text style={styles.payment}>
          Bitte überweisen Sie den Gesamtbetrag innerhalb von 14 Tagen unter
          Angabe der Rechnungsnummer auf das folgende Konto:
        </Text>
        {prefs.iban ? <Text style={styles.payment}>IBAN: {prefs.iban}</Text> : null}

        <Text style={styles.footer} fixed>
          {footerParts.join("  ·  ")}
        </Text>
      </Page>
    </Document>
  );
}
