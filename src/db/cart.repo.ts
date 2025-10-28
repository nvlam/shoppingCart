import type { CartRow, ID, Invoice } from "../models/types";
import { all, first, run, withTx } from "./db";

/** Thêm vào giỏ. Nếu sản phẩm đã có -> cộng dồn qty. Snapshot giá & tên tại thời điểm add. */
export async function addToCart(product_id: ID, qty = 1) {
  return withTx(async (db) => {
    // lấy snapshot từ products
    const p = await db.getFirstAsync<{ name: string; price: number; unit: string | null }>(
      `SELECT name, price, unit FROM products WHERE id=?`,
      [product_id]
    );
    if (!p) throw new Error("Product not found");
    const unit_price = p.price;
    // nếu đã có -> update qty
    const existing = await db.getFirstAsync<{ id: number; qty: number }>(
      `SELECT id, qty FROM cart_items WHERE product_id=?`,
      [product_id]
    );
    if (existing) {
      const newQty = existing.qty + qty;
      const newLine = newQty * unit_price;
      await db.runAsync(
        `UPDATE cart_items SET qty=?, unit_price=?, line_total=? WHERE id=?`,
        [newQty, unit_price, newLine, existing.id]
      );
      return existing.id as ID;
    } else {
      const line = qty * unit_price;
      const res = await db.runAsync(
        `INSERT INTO cart_items(product_id, name, unit, qty, unit_price, line_total)
         VALUES(?,?,?,?,?,?)`,
        [product_id, p.name, p.unit ?? null, qty, unit_price, line]
      );
      // @ts-ignore
      return res.lastInsertRowId as ID;
    }
  });
}

export async function listCart(): Promise<CartRow[]> {
  return all<CartRow>(`SELECT * FROM cart_items ORDER BY id DESC;`);
}

export async function updateCartQty(row_id: ID, qty: number) {
  if (qty <= 0) return removeFromCart(row_id);
  const row = await first<CartRow>(`SELECT * FROM cart_items WHERE id=?`, [row_id]);
  if (!row) throw new Error("Cart row not found");
  const line = qty * row.unit_price;
  await run(`UPDATE cart_items SET qty=?, line_total=? WHERE id=?`, [qty, line, row_id]);
}

export async function removeFromCart(row_id: ID) {
  await run(`DELETE FROM cart_items WHERE id=?`, [row_id]);
}

export async function clearCart() {
  await run(`DELETE FROM cart_items`);
}

export async function computeInvoice(): Promise<Invoice> {
  const items = await listCart();
  const subtotal = items.reduce((s, it) => s + it.line_total, 0);
  const discount = 0; // tuỳ chính sách
  const tax = 0;      // tuỳ chính sách
  const total = subtotal - discount + tax;
  return { items, subtotal, discount, tax, total };
}
