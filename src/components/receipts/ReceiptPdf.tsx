import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { APP_NAME } from "@/config/site";
import { DISCLAIMER, methodLabel, money, type ReceiptData } from "@/lib/receipts";
import { LOGO_PNG } from "@/lib/logo-data";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  band: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: "#ea580c" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#391945", marginLeft: 8 },
  void: { marginTop: 10, padding: 8, backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: 4, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  label: { fontSize: 8, color: "#78716c", textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  cell: { width: "50%", marginBottom: 10 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d6d3d1", paddingBottom: 4, marginTop: 14, color: "#78716c", fontSize: 8, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4" },
  cName: { flex: 1 }, cQty: { width: 40, textAlign: "right" }, cPrice: { width: 80, textAlign: "right" }, cAmt: { width: 90, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10, fontSize: 13, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 14, padding: 8, backgroundColor: "#f5f5f4", borderRadius: 4 },
  foot: { marginTop: 24, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e7e5e4", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  disc: { fontSize: 8, color: "#78716c", width: "78%", lineHeight: 1.4 },
});

export function ReceiptPdf({ r, qr, url }: { r: ReceiptData; qr?: string; url: string }) {
  return (
    <Document title={`Receipt ${r.receipt_no}`} author={APP_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={s.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image src={LOGO_PNG} style={{ width: 28, height: 28 }} />
            <Text style={s.brand}>{APP_NAME}</Text>
          </View>
          <Text style={{ color: "#6b645e" }}>Receipt</Text>
        </View>
        {r.voided && <Text style={s.void}>VOID{r.void_reason ? `: ${r.void_reason}` : ""}</Text>}
        <View style={s.row}>
          <View><Text style={s.label}>Receipt no.</Text><Text style={s.value}>{r.receipt_no}</Text></View>
          <View><Text style={s.label}>Date</Text><Text style={s.value}>{new Date(r.sale_date + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</Text></View>
        </View>
        <View style={s.grid}>
          <View style={s.cell}><Text style={s.label}>Seller</Text><Text style={s.value}>{r.seller}</Text></View>
          <View style={s.cell}><Text style={s.label}>Buyer</Text><Text style={s.value}>{r.buyer}</Text>{r.buyer_contact && <Text>{r.buyer_contact}</Text>}</View>
          <View style={s.cell}><Text style={s.label}>Payment</Text><Text style={s.value}>{methodLabel[r.payment_method]}</Text></View>
          {r.mpesa_code && <View style={s.cell}><Text style={s.label}>M-Pesa code</Text><Text style={s.value}>{r.mpesa_code}</Text></View>}
        </View>
        <View style={s.th}><Text style={s.cName}>Item</Text><Text style={s.cQty}>Qty</Text><Text style={s.cPrice}>Price</Text><Text style={s.cAmt}>Amount</Text></View>
        {r.items.map((i, n) => (
          <View key={n} style={s.tr} wrap={false}>
            <Text style={s.cName}>{i.name}</Text><Text style={s.cQty}>{i.quantity}</Text>
            <Text style={s.cPrice}>{money(i.unit_price)}</Text><Text style={s.cAmt}>{money(i.quantity * i.unit_price)}</Text>
          </View>
        ))}
        <View style={s.total}><Text>Total  {money(r.total)}</Text></View>
        {r.notes && <Text style={s.notes}>Notes: {r.notes}</Text>}
        <View style={s.foot}>
          <View style={{ width: "78%" }}><Text style={s.disc}>{DISCLAIMER(APP_NAME)}</Text><Text style={[s.disc, { marginTop: 4 }]}>Verify: {url}</Text></View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          {qr && <Image src={qr} style={{ width: 64, height: 64 }} />}
        </View>
      </Page>
    </Document>
  );
}
