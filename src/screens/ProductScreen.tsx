import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { addToCart } from "../db/cart.repo";
import { ensureSchema, seedIfEmpty } from "../db/db";
import { createProduct, deleteProduct, listProducts } from "../db/product.repo";
import type { Product } from "../models/types";

export default function ProductScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [unit, setUnit] = useState("");

  // quantity input cho add nhanh
  const [quickQty, setQuickQty] = useState<string>("1");

  const load = async () => {
    const rows = await listProducts();
    setProducts(rows);
  };

  useEffect(() => {
    (async () => {
      await ensureSchema();
      await seedIfEmpty();
      await load();
    })();
  }, []);

  const canAdd = useMemo(() => name.trim().length > 0 && !Number.isNaN(Number(price)) && Number(price) >= 0, [name, price]);

  const onAdd = async () => {
    try {
      if (!canAdd) return;
      await createProduct({ name: name.trim(), price: Number(price), unit: unit.trim() || undefined });
      setName(""); setPrice(""); setUnit("");
      await load();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message ?? "Không thêm được sản phẩm");
    }
  };

  const onDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      await load();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message ?? "Không xoá được sản phẩm");
    }
  };

  const onAddToCart = async (p: Product) => {
    try {
      const q = Math.max(1, Number(quickQty) || 1);
      await addToCart(p.id, q);
      Alert.alert("Đã thêm giỏ", `${p.name} x${q}`);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message ?? "Không thêm vào giỏ được");
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.name}</Text>
        <Text>Giá: {item.price.toLocaleString()} {item.unit ? `/${item.unit}` : ""}</Text>
        <Text style={styles.time}>Tạo lúc: {new Date(item.created_at).toLocaleString()}</Text>
      </View>

      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TextInput
            value={quickQty}
            onChangeText={setQuickQty}
            keyboardType="numeric"
            placeholder="Qty"
            style={[styles.input, { width: 60, paddingVertical: 6 }]}
          />
          <TouchableOpacity style={styles.cartBtn} onPress={() => onAddToCart(item)}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>+ Cart</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(item.id)}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Xoá</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Products</Text>

      <View style={styles.row}>
        <TextInput placeholder="Tên sản phẩm" value={name} onChangeText={setName} style={[styles.input, { flex: 2 }]} />
        <TextInput placeholder="Giá" keyboardType="numeric" value={price} onChangeText={setPrice} style={[styles.input, { flex: 1 }]} />
        <TextInput placeholder="Đơn vị (tuỳ chọn)" value={unit} onChangeText={setUnit} style={[styles.input, { flex: 1 }]} />
        <TouchableOpacity style={[styles.addBtn, { opacity: canAdd ? 1 : 0.5 }]} onPress={onAdd} disabled={!canAdd}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: "#666" }}>Chọn nhanh số lượng để thêm vào giỏ:</Text>
        <TouchableOpacity onPress={() => router.push("/cart")} style={styles.gotoCart}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Xem Giỏ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  addBtn: { backgroundColor: "#1e90ff", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  gotoCart: { backgroundColor: "#2db84c", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  card: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 },
  title: { fontSize: 16, fontWeight: "700" },
  time: { color: "#666", marginTop: 4, fontSize: 12 },
  delBtn: { backgroundColor: "#ff4d4f", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  cartBtn: { backgroundColor: "#6a5acd", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
});
