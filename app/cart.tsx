import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { clearCart, computeInvoice, listCart, removeFromCart, updateCartQty } from "../src/db/cart.repo";
import { ensureSchema } from "../src/db/db";
import { checkoutFromCart } from "../src/db/order.repo";
import type { CartRow, Invoice } from "../src/models/types";

export default function CartScreen() {
  const [items, setItems] = useState<CartRow[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    const rows = await listCart();
    setItems(rows);
    setInvoice(await computeInvoice());
  };

  useEffect(() => {
    (async () => {
      await ensureSchema();
      await load();
    })();
  }, []);

  const changeQty = async (row: CartRow, text: string) => {
    const q = Math.max(0, Number(text) || 0);
    await updateCartQty(row.id, q);
    await load();
  };

  const removeRow = async (row: CartRow) => {
    await removeFromCart(row.id);
    await load();
  };

  const checkout = async () => {
    try {
      const orderId = await checkoutFromCart(note.trim() || undefined);
      Alert.alert("Đã tạo đơn hàng", `Mã đơn: #${orderId}`);
      router.back(); // quay về products
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message ?? "Checkout thất bại");
    }
  };

  const clear = async () => {
    await clearCart();
    await load();
  };

  const renderItem = ({ item }: { item: CartRow }) => (
    <View style={styles.rowCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.name}</Text>
        <Text>Đơn giá: {item.unit_price.toLocaleString()} {item.unit ? `/${item.unit}` : ""}</Text>
        <Text style={{ color: "#666" }}>Thành tiền: {item.line_total.toLocaleString()}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <TextInput
          keyboardType="numeric"
          value={String(item.qty)}
          onChangeText={(t) => changeQty(item, t)}
          style={[styles.input, { width: 70, paddingVertical: 6 }]}
        />
        <TouchableOpacity style={styles.delBtn} onPress={() => removeRow(item)}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Xoá</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Giỏ hàng</Text>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={<Text style={{ color: "#666", textAlign: "center", marginTop: 40 }}>Giỏ hàng trống</Text>}
      />

      <View style={{ gap: 8, marginTop: 12 }}>
        <TextInput
          placeholder="Ghi chú đơn hàng (tuỳ chọn)"
          value={note}
          onChangeText={setNote}
          style={[styles.input, { paddingVertical: 10 }]}
        />

        {/* Invoice summary */}
        {invoice && (
          <View style={styles.invoiceBox}>
            <Row label="Tạm tính" value={invoice.subtotal} />
            <Row label="Giảm giá" value={invoice.discount} />
            <Row label="Thuế" value={invoice.tax} />
            <Row label="Tổng cộng" value={invoice.total} bold />
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: "#ff4d4f" }]} onPress={clear}>
            <Text style={styles.btnText}>Xoá giỏ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: "#2db84c", flex: 1 }]} onPress={checkout}>
            <Text style={styles.btnText}>Thanh toán</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: "#555" }}>{label}</Text>
      <Text style={{ fontWeight: bold ? "800" as const : "600" }}>{value.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  rowCard: { flexDirection: "row", gap: 12, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  invoiceBox: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, gap: 6, backgroundColor: "#fafafa" },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  delBtn: { backgroundColor: "#ff4d4f", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
});
