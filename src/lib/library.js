/* Library of Tomorrow: data layer
 *
 * The class hierarchy mirrors the Java code: LibraryItem -> Book / Vinyl / Movie,
 * plus Manga and Comic.
 *
 * Two interchangeable stores with the same methods and the same SQL tables
 * (see database/schema.sql):
 *   ApiStore     -> public/api.php (PHP + MySQL). Used when the site is served by PHP.
 *   BrowserStore -> SQLite compiled to WebAssembly (sql.js), saved in this browser.
 *                   Used on static hosting (GitHub Pages, previews) and `npm run dev`.
 *
 * Tables: items, loans, activity, members, orders.
 * Every write returns a message (the same wording as the Java version's println)
 * and records the SQL it ran in the `activity` table.
 *
 * Payments are a DEMO: nothing is charged and card numbers are never stored or
 * sent anywhere. Only the order total and the last four digits are recorded.
 */

import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

/* ---------- Rules ---------- */

export const LOAN_DAYS = 14;
export const MAX_PER_CHECKOUT = 5;
export const DELIVERY_FEE_CENTS = 250;      // per item, home delivery
export const FINE_PER_DAY_CENTS = 25;       // overdue fine
export const FINE_CAP_CENTS = 500;          // per loan
export const DEMO_CARD = "4242424242424242"; // the only card the demo accepts

/* ---------- Model: same shape as the Java classes ---------- */

export class LibraryItem {
  constructor(id, title, isAvailable = true) {
    this.id = id;
    this.title = title;
    this.isAvailable = isAvailable;
    this.borrowedAt = null;  // set from the open row in `loans`
    this.year = null;        // first published / released
    this.description = "";
  }
  get type() { return "item"; }
  get creator() { return ""; }
  get creatorLine() { return ""; }
  get prefix() { return "IT"; }

  // Library call number, e.g. "BK GRE 0001"
  get callNumber() {
    const words = this.creator.trim().split(/\s+/);
    const name = (words[words.length - 1] || "XXX").replace(/[^A-Za-z]/g, "");
    return `${this.prefix} ${name.slice(0, 3).toUpperCase().padEnd(3, "X")} ${String(this.id).padStart(4, "0")}`;
  }

  get dueDate() {
    return dueFrom(this.borrowedAt);
  }
}

export class Book extends LibraryItem {
  constructor(id, title, author, isAvailable) {
    super(id, title, isAvailable);
    this.author = author;
  }
  get type() { return "book"; }
  get prefix() { return "BK"; }
  get creator() { return this.author; }
  get creatorLine() { return `by ${this.author}`; }
}

export class Vinyl extends LibraryItem {
  constructor(id, title, artist, isAvailable) {
    super(id, title, isAvailable);
    this.artist = artist;
  }
  get type() { return "vinyl"; }
  get prefix() { return "LP"; }
  get creator() { return this.artist; }
  get creatorLine() { return `by ${this.artist}`; }
}

export class Movie extends LibraryItem {
  constructor(id, title, director, isAvailable) {
    super(id, title, isAvailable);
    this.director = director;
  }
  get type() { return "movie"; }
  get prefix() { return "DVD"; }
  get creator() { return this.director; }
  get creatorLine() { return `directed by ${this.director}`; }
}

export class Manga extends LibraryItem {
  constructor(id, title, author, isAvailable) {
    super(id, title, isAvailable);
    this.author = author;
  }
  get type() { return "manga"; }
  get prefix() { return "MG"; }
  get creator() { return this.author; }
  get creatorLine() { return `by ${this.author}`; }
}

export class Comic extends LibraryItem {
  constructor(id, title, writer, isAvailable) {
    super(id, title, isAvailable);
    this.writer = writer;
  }
  get type() { return "comic"; }
  get prefix() { return "CX"; }
  get creator() { return this.writer; }
  get creatorLine() { return `written by ${this.writer}`; }
}

export const ITEM_CLASSES = { book: Book, manga: Manga, comic: Comic, vinyl: Vinyl, movie: Movie };
export const TYPES = Object.keys(ITEM_CLASSES);
export const TYPE_LABEL = { book: "Books", manga: "Manga", comic: "Comics", vinyl: "Vinyl", movie: "Film" };
export const TYPE_SINGULAR = { book: "Book", manga: "Manga", comic: "Comic", vinyl: "Vinyl", movie: "Film" };
export const TYPE_NOUN = { book: "book", manga: "manga", comic: "comic", vinyl: "record", movie: "film" };
export const CREATOR_LABEL = { book: "Author", manga: "Author", comic: "Writer", vinyl: "Artist", movie: "Director" };

export function itemFromRow(row) {
  const Cls = ITEM_CLASSES[row.type];
  const item = new Cls(Number(row.id), row.title, row.creator, Number(row.is_available) === 1);
  item.borrowedAt = row.borrowed_at || null;
  item.year = row.year ? Number(row.year) : null;
  item.description = row.description || "";
  return item;
}

export function parseUtc(s) {
  return s ? new Date(String(s).replace(" ", "T") + "Z") : null;
}

export function dueFrom(borrowedAt) {
  const d = parseUtc(borrowedAt);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + LOAN_DAYS);
  return d;
}

// Fine for one loan: $0.25 per day past due, capped at $5. Uses the return date if returned.
export function fineCents(borrowedAt, returnedAt, paidCents = 0, now = new Date()) {
  const due = dueFrom(borrowedAt);
  if (!due) return 0;
  const end = parseUtc(returnedAt) || now;
  const days = Math.floor((end - due) / 86400000);
  const accrued = days > 0 ? Math.min(days * FINE_PER_DAY_CENTS, FINE_CAP_CENTS) : 0;
  return Math.max(0, accrued - (Number(paidCents) || 0));
}

export function daysOverdue(borrowedAt, returnedAt, now = new Date()) {
  const due = dueFrom(borrowedAt);
  if (!due) return 0;
  const end = parseUtc(returnedAt) || now;
  return Math.max(0, Math.floor((end - due) / 86400000));
}

export function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// The demo rule: only the test card is accepted (nothing is ever charged)
export function checkDemoCard(number) {
  const digits = String(number).replace(/\D/g, "");
  if (digits !== DEMO_CARD) {
    return "This is a demo checkout. Use the test card 4242 4242 4242 4242; no real card is ever charged.";
  }
  return "";
}

function donationLine(type, title, creator) {
  const by = { movie: `directed by ${creator}`, comic: `written by ${creator}` }[type] || `by ${creator}`;
  return `${title} ${by} has been donated to the library.`;
}

/* ---------- Shared SQL ---------- */

// Fallback starting collection (same items as main() in the Java version).
// The full one lives in public/seed.json, shared with api.php and schema.sql.
// Item rows: [type, title, creator, year, description]
const FALLBACK_SEED = {
  member: { name: "Carlos Zabala", email: "" },
  items: [
    ["book", "The Fault in Our Stars", "John Green", 2012, ""],
    ["book", "A Good Book", "Author Name", null, ""],
    ["vinyl", "Abbey Road", "The Beatles", 1969, ""],
    ["vinyl", "Dark Side of the Moon", "Pink Floyd", 1973, ""],
    ["movie", "Inception", "Christopher Nolan", 2010, ""],
    ["movie", "The Matrix", "The Wachowskis", 1999, ""],
  ],
  loans: [],
};

// SQLite version of schema.sql (MySQL uses AUTO_INCREMENT / DATETIME instead)
const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT    NOT NULL CHECK (type IN ('book', 'vinyl', 'movie', 'manga', 'comic')),
  title        TEXT    NOT NULL,
  creator      TEXT    NOT NULL,
  year         INTEGER,
  description  TEXT    NOT NULL DEFAULT '',
  is_available INTEGER NOT NULL DEFAULT 1,
  added_at     TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL DEFAULT '',
  card_number TEXT NOT NULL,
  joined_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS loans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id          INTEGER NOT NULL REFERENCES items(id),
  member_id        INTEGER REFERENCES members(id),
  borrowed_at      TEXT    NOT NULL,
  returned_at      TEXT,
  fine_paid_cents  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id    INTEGER NOT NULL REFERENCES members(id),
  kind         TEXT    NOT NULL CHECK (kind IN ('checkout', 'fines')),
  item_count   INTEGER NOT NULL DEFAULT 0,
  delivery     TEXT    NOT NULL DEFAULT 'pickup',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  card_last4   TEXT,
  created_at   TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  message    TEXT NOT NULL,
  sql_text   TEXT NOT NULL,
  created_at TEXT NOT NULL
);`;

const ITEM_COLUMNS = "i.id, i.type, i.title, i.creator, i.year, i.description, i.is_available, l.borrowed_at";
const MEMBER_ID = 1; // this demo has one member: you

function normalizeSeed(data) {
  if (Array.isArray(data)) return { ...FALLBACK_SEED, items: data, loans: [] };
  if (data && Array.isArray(data.items) && data.items.length) {
    return { member: data.member || FALLBACK_SEED.member, items: data.items, loans: data.loans || [] };
  }
  return FALLBACK_SEED;
}

async function loadSeed() {
  try {
    const res = await fetch("seed.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return normalizeSeed(await res.json());
  } catch (e) {
    return FALLBACK_SEED;
  }
}

// Summarize a big seed INSERT for the activity log: first rows, then a count
function seedSqlText(rows) {
  const shown = rows.slice(0, 4).map(r => "  " + showSql("(?, ?, ?, ?)", r.slice(0, 4))).join(",\n");
  const more = rows.length > 4 ? `,\n  -- ...and ${rows.length - 4} more rows` : "";
  return `INSERT INTO items (type, title, creator, year) VALUES\n${shown}${more};`;
}

// "2026-10-26 18:40:00" in UTC, the same format PHP and MySQL use
function utc(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function daysAgo(n) {
  return utc(new Date(Date.now() - n * 86400000));
}

// A library card number like "2918 4402 7731", made from the member's name
function cardNumberFor(name) {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const n = String(h).padStart(10, "0") + "73";
  return `${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8, 12)}`;
}

// Show a statement with its ? placeholders filled in, for the activity log
export function showSql(sql, params = []) {
  let i = 0;
  return sql.trim().replace(/\?/g, () => {
    const v = params[i++];
    if (v === null || v === undefined) return "NULL";
    return typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  });
}

/* ---------- Store 1: PHP + MySQL through api.php ---------- */

export class ApiStore {
  constructor(base = "api.php") {
    this.base = base;
    this.kind = "php";
    this.label = "PHP + MySQL";
  }

  static async detect() {
    try {
      const res = await fetch("api.php?action=ping", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.ok ? new ApiStore() : null;
    } catch (e) {
      return null; // 404, raw PHP text, or offline -> not available
    }
  }

  async call(action, body, query = "") {
    const opts = body
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : { cache: "no-store" };
    const res = await fetch(`${this.base}?action=${action}${query}`, opts);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || data.message || `Request failed (${res.status})`);
    return data;
  }

  async allItems() { return (await this.call("items")).items.map(itemFromRow); }
  async recentActivity() { return (await this.call("activity")).activity; }
  async itemDetail(id) {
    const d = await this.call("item", null, `&id=${encodeURIComponent(id)}`);
    return { item: itemFromRow(d.item), loans: d.loans, sql: d.sql };
  }
  async borrow(id) { return (await this.call("borrow", { id })).message; }
  async giveBack(id) { return (await this.call("return", { id })).message; }
  async donate(fields) { return (await this.call("donate", fields)).message; }
  async reset() { return (await this.call("reset", {})).message; }
  async profile() { return this.call("profile"); }
  async updateProfile(fields) { return (await this.call("profile_update", fields)).message; }
  async checkout(order) { return this.call("checkout", order); }
  async payFines(payment) { return (await this.call("pay_fines", payment)).message; }
}

/* ---------- Store 2: SQLite in the browser (sql.js) ---------- */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

const STORAGE_KEY = "library-of-tomorrow-db-v5";

export class BrowserStore {
  constructor(SQL, seed = FALLBACK_SEED) {
    this.SQL = SQL;
    this.seedData = seed;
    this.kind = "browser";
    this.label = "SQLite in your browser";
    const saved = this.load();
    this.db = saved ? new SQL.Database(saved) : new SQL.Database();
    this.db.exec(SQLITE_SCHEMA);
    if (!saved) this.seed();
  }

  static async create() {
    let SQL;
    try {
      // WebAssembly build from npm; Vite copies the .wasm file into the build
      SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
    } catch (e) {
      // Fallback: same SQLite compiled to plain JavaScript (slower, no .wasm needed)
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-asm.js");
      SQL = await window.initSqlJs();
    }
    return new BrowserStore(SQL, await loadSeed());
  }

  seed() {
    const { member, items, loans } = this.seedData;
    const now = utc();
    this.db.run("INSERT INTO members (id, name, email, card_number, joined_at) VALUES (?, ?, ?, ?, ?);",
      [MEMBER_ID, member.name, member.email || "", cardNumberFor(member.name), now]);

    const stmt = this.db.prepare(
      "INSERT INTO items (type, title, creator, year, description, added_at) VALUES (?, ?, ?, ?, ?, ?);"
    );
    items.forEach(([type, title, creator, year = null, description = ""]) =>
      stmt.run([type, title, creator, year, description || "", now]));
    stmt.free();

    // example loan history (one is overdue, so fines have something to show)
    for (const l of loans) {
      const row = this.query("SELECT id FROM items WHERE title = ? LIMIT 1;", [l.title])[0];
      if (!row) continue;
      this.db.run("INSERT INTO loans (item_id, member_id, borrowed_at, returned_at) VALUES (?, ?, ?, ?);",
        [row.id, MEMBER_ID, daysAgo(l.borrowed_days_ago), l.returned_days_ago == null ? null : daysAgo(l.returned_days_ago)]);
      if (l.returned_days_ago == null) this.db.run("UPDATE items SET is_available = 0 WHERE id = ?;", [row.id]);
    }

    this.log(`The library opened with ${items.length} items.`, seedSqlText(items));
  }

  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    return showSql(sql, params);
  }

  // run several writes as one transaction; roll back if any throws
  transaction(fn) {
    this.db.exec("BEGIN;");
    try {
      const out = fn();
      this.db.exec("COMMIT;");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK;");
      throw e;
    }
  }

  getItem(id) {
    const rows = this.query(
      `SELECT ${ITEM_COLUMNS} FROM items i
       LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
       WHERE i.id = ?;`, [id]);
    return rows.length ? itemFromRow(rows[0]) : null;
  }

  /* show */
  async allItems() {
    // LEFT JOIN picks up the open loan (if any) so we can show a due date
    return this.query(
      `SELECT ${ITEM_COLUMNS}
       FROM items i
       LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
       ORDER BY i.type, i.title COLLATE NOCASE;`
    ).map(itemFromRow);
  }

  /* one item + its loan history, for the description page */
  async itemDetail(id) {
    const item = this.getItem(id);
    if (!item) throw new Error("Item not found.");
    const sql = "SELECT borrowed_at, returned_at FROM loans WHERE item_id = ? ORDER BY id DESC;";
    const loans = this.query(sql, [id]);
    return { item, loans, sql: showSql(sql, [id]) };
  }

  borrowOne(id) {
    const item = this.getItem(id);
    const check = showSql("SELECT is_available FROM items WHERE id = ?;", [id]);
    if (!item) return { ok: false, message: "Item not found.", sql: check };
    if (!item.isAvailable) return { ok: false, message: `${item.title} is currently not available.`, sql: check };
    const s1 = this.run("UPDATE items SET is_available = 0 WHERE id = ?;", [id]);
    const s2 = this.run("INSERT INTO loans (item_id, member_id, borrowed_at) VALUES (?, ?, ?);", [id, MEMBER_ID, utc()]);
    return { ok: true, message: `${item.title} has been borrowed.`, sql: `${s1}\n${s2}`, title: item.title };
  }

  /* borrow */
  async borrow(id) {
    const r = this.borrowOne(id);
    return this.log(r.message, r.sql);
  }

  /* return */
  async giveBack(id) {
    const item = this.getItem(id);
    const check = showSql("SELECT is_available FROM items WHERE id = ?;", [id]);
    if (!item) return this.log("Item not found.", check);
    if (item.isAvailable) return this.log(`${item.title} was not borrowed.`, check);
    const s1 = this.run("UPDATE items SET is_available = 1 WHERE id = ?;", [id]);
    const s2 = this.run(
      "UPDATE loans SET returned_at = ? WHERE item_id = ? AND returned_at IS NULL;", [utc(), id]);
    return this.log(`${item.title} has been returned.`, `${s1}\n${s2}`);
  }

  /* donate */
  async donate({ type, title, creator, year = null, description = "" }) {
    if (!ITEM_CLASSES[type]) return this.log("Invalid item type.", "-- no query run");
    const y = year ? Number(year) : null;
    const s = this.run(
      "INSERT INTO items (type, title, creator, year, description, added_at) VALUES (?, ?, ?, ?, ?, ?);",
      [type, title, creator, Number.isFinite(y) ? y : null, description || "", utc()]);
    return this.log(donationLine(type, title, creator), s);
  }

  /* bag checkout: borrow several items at once, record the order */
  async checkout({ ids = [], delivery = "pickup", cardNumber = "" }) {
    const unique = [...new Set(ids.map(Number))].slice(0, MAX_PER_CHECKOUT);
    if (!unique.length) throw new Error("Your bag is empty.");
    const amount = delivery === "delivery" ? unique.length * DELIVERY_FEE_CENTS : 0;
    if (amount > 0) {
      const problem = checkDemoCard(cardNumber);
      if (problem) throw new Error(problem);
    }
    const result = this.transaction(() => {
      const results = unique.map(id => this.borrowOne(id));
      const borrowed = results.filter(r => r.ok);
      if (!borrowed.length) throw new Error(results[0]?.message || "Nothing in your bag could be borrowed.");
      const charge = delivery === "delivery" ? borrowed.length * DELIVERY_FEE_CENTS : 0;
      const sOrder = this.run(
        "INSERT INTO orders (member_id, kind, item_count, delivery, amount_cents, card_last4, created_at) VALUES (?, 'checkout', ?, ?, ?, ?, ?);",
        [MEMBER_ID, borrowed.length, delivery, charge, charge > 0 ? DEMO_CARD.slice(-4) : null, utc()]);
      const orderId = this.query("SELECT last_insert_rowid() AS id;")[0].id;
      return { borrowed, skipped: results.filter(r => !r.ok), charge, orderId, sql: [...borrowed.map(r => r.sql), sOrder].join("\n") };
    });
    const names = result.borrowed.map(r => r.title).join(", ");
    const message = `Checked out ${result.borrowed.length} item${result.borrowed.length > 1 ? "s" : ""}: ${names}.`;
    this.log(message, result.sql);
    return {
      message,
      orderId: result.orderId,
      borrowed: result.borrowed.map(r => r.title),
      skipped: result.skipped.map(r => r.message),
      amountCents: result.charge,
      delivery,
      dueDate: dueFrom(utc()).toISOString(),
    };
  }

  /* member profile: card, loans, fines, orders */
  async profile() {
    const member = this.query("SELECT id, name, email, card_number, joined_at FROM members WHERE id = ?;", [MEMBER_ID])[0];
    const loans = this.query(
      `SELECT l.id, l.item_id, i.title, i.type, i.creator, l.borrowed_at, l.returned_at, l.fine_paid_cents
       FROM loans l JOIN items i ON i.id = l.item_id
       WHERE l.member_id = ?
       ORDER BY l.id DESC;`, [MEMBER_ID]);
    const orders = this.query(
      "SELECT id, kind, item_count, delivery, amount_cents, card_last4, created_at FROM orders WHERE member_id = ? ORDER BY id DESC;",
      [MEMBER_ID]);
    return { member, loans, orders };
  }

  async updateProfile({ name, email }) {
    const n = String(name || "").trim().slice(0, 80);
    if (!n) throw new Error("Add your name.");
    const e = String(email || "").trim().slice(0, 120);
    const s = this.run("UPDATE members SET name = ?, email = ? WHERE id = ?;", [n, e, MEMBER_ID]);
    return this.log("Your profile was updated.", s);
  }

  async payFines({ cardNumber = "" }) {
    const { loans } = await this.profile();
    const owed = loans
      .map(l => ({ ...l, owed: fineCents(l.borrowed_at, l.returned_at, l.fine_paid_cents) }))
      .filter(l => l.owed > 0);
    const total = owed.reduce((s, l) => s + l.owed, 0);
    if (!total) throw new Error("You don't owe any fines.");
    const problem = checkDemoCard(cardNumber);
    if (problem) throw new Error(problem);
    const sql = this.transaction(() => {
      const lines = owed.map(l => this.run(
        "UPDATE loans SET fine_paid_cents = fine_paid_cents + ? WHERE id = ?;", [l.owed, l.id]));
      lines.push(this.run(
        "INSERT INTO orders (member_id, kind, item_count, delivery, amount_cents, card_last4, created_at) VALUES (?, 'fines', ?, 'none', ?, ?, ?);",
        [MEMBER_ID, owed.length, total, DEMO_CARD.slice(-4), utc()]));
      return lines.join("\n");
    });
    return this.log(`Paid ${money(total)} in fines. Thank you!`, sql);
  }

  /* activity log */
  log(message, sqlText) {
    this.db.run("INSERT INTO activity (message, sql_text, created_at) VALUES (?, ?, ?);",
      [message, sqlText, utc()]);
    this.save();
    return message;
  }

  async recentActivity(limit = 30) {
    return this.query(
      "SELECT id, message, sql_text, created_at FROM activity ORDER BY id DESC LIMIT ?;", [limit]);
  }

  async reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    this.db.close();
    this.db = new this.SQL.Database();
    this.db.exec(SQLITE_SCHEMA);
    this.seed();
    return "The library was reset.";
  }

  /* persistence: keep the database file in this browser */
  save() {
    try {
      const bytes = this.db.export();
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      localStorage.setItem(STORAGE_KEY, btoa(bin));
    } catch (e) { /* storage unavailable: the library still works for this visit */ }
  }

  load() {
    try {
      const b64 = localStorage.getItem(STORAGE_KEY);
      if (!b64) return null;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch (e) { return null; }
  }
}

export async function openLibrary() {
  return (await ApiStore.detect()) || (await BrowserStore.create());
}

/* ---------- Online catalogs: Open Library, MusicBrainz, Wikidata ----------
   Free public databases. We take titles, names and years only.
   Manga and comics are searched in Open Library too (it holds graphic novels
   and translated manga volumes).
   On a PHP server the request goes through lookup.php (MusicBrainz asks apps to
   send a User-Agent, which browsers can't set). Otherwise the browser asks the
   catalogs directly. */

const openLibraryUrl = q =>
  `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=title,author_name,first_publish_year&limit=8`;

const parseOpenLibrary = d => (d.docs || []).map(x => ({
  title: x.title,
  creator: (x.author_name || [])[0] || "Unknown author",
  year: x.first_publish_year ? String(x.first_publish_year) : "",
}));

export const CATALOGS = {
  book: { source: "Open Library", url: openLibraryUrl, parse: parseOpenLibrary },
  manga: { source: "Open Library", url: openLibraryUrl, parse: parseOpenLibrary },
  comic: { source: "Open Library", url: openLibraryUrl, parse: parseOpenLibrary },
  vinyl: {
    source: "MusicBrainz",
    url: q => `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(q)}&fmt=json&limit=15`,
    parse: d => {
      const groups = d["release-groups"] || [];
      const albums = groups.filter(x => x["primary-type"] === "Album");
      return (albums.length ? albums : groups).slice(0, 8).map(x => ({
        title: x.title,
        creator: (x["artist-credit"] || []).map(a => a.name + (a.joinphrase || "")).join("") || "Unknown artist",
        year: (x["first-release-date"] || "").slice(0, 4),
      }));
    },
  },
  movie: {
    source: "Wikidata",
    url: q => `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&uselang=en&type=item&limit=20&format=json&origin=*`,
    // descriptions look like "2010 film by Christopher Nolan" or "1942 American film directed by Michael Curtiz"
    parse: d => (d.search || [])
      .filter(x => /\bfilm\b/i.test(x.description || ""))
      .slice(0, 8)
      .map(x => {
        const by = /\bby (.+)$/i.exec(x.description || "");
        const year = /\b(1[89]\d\d|20\d\d)\b/.exec(x.description || "");
        return { title: x.label, creator: by ? by[1].trim() : "Unknown director", year: year ? year[1] : "" };
      }),
  },
};

export async function searchCatalog(store, type, q) {
  const cat = CATALOGS[type];
  if (store instanceof ApiStore) {
    const res = await fetch(`lookup.php?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
    return data.results;
  }
  const res = await fetch(cat.url(q), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${cat.source} answered with ${res.status}`);
  return cat.parse(await res.json());
}
