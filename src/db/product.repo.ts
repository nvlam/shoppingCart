import type { ID, NewProduct, Product } from "../models/types";
import { all, first, run } from "./db";

/** Lấy tất cả sản phẩm (mới nhất trước) */
export async function listProducts(): Promise<Product[]> {
  return all<Product>(`SELECT * FROM products ORDER BY id DESC;`);
}

/** Tìm theo id */
export async function getProduct(id: ID): Promise<Product | null> {
  return (await first<Product>(`SELECT * FROM products WHERE id=?;`, [id])) ?? null;
}

/** Thêm mới */
export async function createProduct(input: NewProduct): Promise<ID> {
  const res = await run(
    `INSERT INTO products(name, price, unit) VALUES(?,?,?);`,
    [input.name.trim(), input.price, input.unit ?? null]
  );
  // @ts-ignore expo-sqlite RunResult has lastInsertRowId
  return res.lastInsertRowId as ID;
}

/** Cập nhật */
export async function updateProduct(id: ID, patch: Partial<NewProduct>) {
  const cur = await getProduct(id);
  if (!cur) throw new Error("Product not found");
  const name = patch.name?.trim() ?? cur.name;
  const price = patch.price ?? cur.price;
  const unit = patch.unit ?? cur.unit ?? null;

  await run(`UPDATE products SET name=?, price=?, unit=? WHERE id=?;`, 
    [
    name,
    price,
    unit,
    id,
  ]);
}

/** Xoá */
export async function deleteProduct(id: ID) {
  await run(`DELETE FROM products WHERE id=?;`, [id]);
}
