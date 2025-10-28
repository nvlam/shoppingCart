export type ID = number;

export interface Product {
  id: ID;
  name: string;
  price: number;
  unit?: string;
  created_at: string;
}

export interface NewProduct {
  name: string;
  price: number;
  unit?: string;
}

export interface Order {
  id: ID;
  created_at: string;
  note?: string;
  total: number;
}

export interface OrderItem {
  id: ID;
  order_id: ID;
  product_id: ID;
  qty: number;
  unit_price: number;
  line_total: number;
}

/** Cart persisted trong SQLite */
export interface CartRow {
  id: ID;
  product_id: ID;
  name: string;        // snapshot
  unit?: string;       // snapshot
  qty: number;
  unit_price: number;  // snapshot (lấy từ products tại thời điểm add)
  line_total: number;  // qty * unit_price
  added_at: string;
}

export interface Invoice {
  items: CartRow[];
  subtotal: number;
  tax: number;       // nếu không dùng thuế, để 0
  discount: number;  // nếu không dùng, 0
  total: number;     // subtotal - discount + tax
}
