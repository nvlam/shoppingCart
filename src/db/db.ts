import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync("shop.db");
    await _db.execAsync("PRAGMA foreign_keys = ON;");
  }
  return _db;
}

async function tableExists(name: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' 
    AND name=?;`,
    [name]
  );
  return (row?.c ?? 0) > 0;
}
async function tableHasColumn(table: string, col: string): Promise<boolean> {
  const db = await getDb();
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  return cols.some((c) => c.name === col);
}

async function migrateProductsAddIdIfNeeded() {
  const db = await getDb();
  if (!(await tableExists("products"))) return;
  const hasId = await tableHasColumn("products", "id");
  if (hasId) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS products_new(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0),
        unit TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(products);`);
    const names = cols.map(c => c.name);
    const srcName = names.includes("name") ? "name" : "NULL";
    const srcPrice = names.includes("price") ? "price" : "0";
    const srcUnit = names.includes("unit") ? "unit" : "NULL";
    const srcCreated = names.includes("created_at") ? "created_at" : "datetime('now')";
    await db.runAsync(`
      INSERT INTO products_new(name, price, unit, created_at)
      SELECT ${srcName}, ${srcPrice}, ${srcUnit}, ${srcCreated} FROM products;
    `);
    await db.runAsync(`DROP TABLE products;`);
    await db.runAsync(`ALTER TABLE products_new RENAME TO products;`);
  });
}

export async function ensureSchema() {
  const db = await getDb();

  await migrateProductsAddIdIfNeeded();

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS products(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      unit TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS orders(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note TEXT,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS order_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty REAL NOT NULL CHECK(qty > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      line_total REAL NOT NULL CHECK(line_total >= 0),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  /* NEW: cart_items (persisted cart) */
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS cart_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE,    -- mỗi sản phẩm 1 dòng trong giỏ
      name TEXT NOT NULL,
      unit TEXT,
      qty REAL NOT NULL CHECK(qty > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      line_total REAL NOT NULL CHECK(line_total >= 0),
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);
}

export async function run(sql: string, params: any[] = []) {
  const db = await getDb();
  return db.runAsync(sql, params);
}
export async function all<T = any>(sql: string, params: any[] = []) {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}
export async function first<T = any>(sql: string, params: any[] = []) {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}
export async function withTx<T>(fn: (tx: SQLite.SQLiteDatabase) => Promise<T>) {
  const db = await getDb();
  return db.withTransactionAsync(async () => fn(db));
}

export async function seedIfEmpty() {
  const row = await first<{ c: number }>(`SELECT COUNT(*) AS c FROM products;`);
  if ((row?.c ?? 0) > 0) return;
  const samples = [
    { name: "Táo Fuji", price: 35000, unit: "kg" },
    { name: "Cam Mỹ", price: 65000, unit: "kg" },
    { name: "Mì gói",  price: 4500,  unit: "pcs" },
  ];
  for (const s of samples) {
    await run(`INSERT INTO products(name, price, unit) VALUES(?,?,?)`, [s.name, s.price, s.unit ?? null]);
  }
}
