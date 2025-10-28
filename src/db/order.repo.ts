import type { ID, Order, OrderItem } from "../models/types";
import { clearCart, listCart } from "./cart.repo";
import { all, first, run, withTx } from "./db";

/** Tạo đơn + items từ mảng tuỳ ý */
export async function createOrder(
  items: { product_id: ID; qty: number; unit_price: number }[],
  note?: string
): Promise<ID> {
  if (items.length === 0) throw new Error("No items");
  return withTx<ID>(async (db) => {
    const res = await db.runAsync(`INSERT INTO orders(note,total) VALUES(?,0)`, [note ?? null]);
    // @ts-ignore
    const orderId = res.lastInsertRowId as ID;

    let total = 0;
    for (const it of items) {
      const line = it.qty * it.unit_price;
      total += line;
      await db.runAsync(
        `INSERT INTO order_items(order_id, product_id, qty, unit_price, line_total)
         VALUES(?,?,?,?,?)`,
        [orderId, it.product_id, it.qty, it.unit_price, line]
      );
    }
    await db.runAsync(`UPDATE orders SET total=? WHERE id=?`, [total, orderId]);
    return orderId;
  });
}

/** NEW: Checkout từ giỏ */
export async function checkoutFromCart(note?: string): Promise<ID> {
  const cart = await listCart();
  if (cart.length === 0) throw new Error("Cart is empty");
  const orderId = await createOrder(
    cart.map((r) => ({ product_id: r.product_id, qty: r.qty, unit_price: r.unit_price })),
    note
  );
  await clearCart();
  return orderId;
}

export async function listOrders(): Promise<Order[]> {
  return all<Order>(`SELECT * FROM orders ORDER BY id DESC`);
}
export async function getOrderItems(order_id: ID): Promise<OrderItem[]> {
  return all<OrderItem>(`SELECT * FROM order_items WHERE order_id=? ORDER BY id ASC`, [order_id]);
}
export async function deleteOrder(order_id: ID) {
  await run(`DELETE FROM orders WHERE id=?`, [order_id]);
}
export async function getOrderStats() {
  const r = await first<{ cnt: number; sum: number }>(
    `SELECT COUNT(*) AS cnt, IFNULL(SUM(total),0) AS sum FROM orders`
  );
  return { count: r?.cnt ?? 0, revenue: r?.sum ?? 0 };
}
