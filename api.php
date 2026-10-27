<?php
// Library of Tomorrow: JSON API (PHP + MySQL via PDO)
//
//   GET  api.php?action=ping            -> { ok: true }
//   GET  api.php?action=items           -> { items: [...] }                     ("show")
//   GET  api.php?action=item&id=5       -> { item, loans, sql }                 description page
//   GET  api.php?action=activity        -> { activity: [...] }
//   GET  api.php?action=profile         -> { member, loans, orders }
//   POST api.php?action=borrow          { id }                                  -> { message }
//   POST api.php?action=return          { id }                                  -> { message }
//   POST api.php?action=donate          { type, title, creator, year?, description? } -> { message }
//   POST api.php?action=checkout        { ids, delivery, cardNumber? }          -> { message, orderId, ... }
//   POST api.php?action=pay_fines       { cardNumber }                          -> { message }
//   POST api.php?action=profile_update  { name, email }                         -> { message }
//   POST api.php?action=reset           {}                                      -> { message }
//
// Messages match the Java version's System.out.println output.
//
// Payments are a DEMO: nothing is charged, only the test card 4242 4242 4242 4242
// is accepted, and card numbers are never stored. Orders keep the total and last four digits.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const TYPES = ['book', 'vinyl', 'movie', 'manga', 'comic'];
const MEMBER_ID = 1;              // this demo has one member
const LOAN_DAYS = 14;
const MAX_PER_CHECKOUT = 5;
const DELIVERY_FEE_CENTS = 250;   // per item
const FINE_PER_DAY_CENTS = 25;
const FINE_CAP_CENTS = 500;       // per loan
const DEMO_CARD = '4242424242424242';

// Fallback starting items (same as main() in the Java version).
// The full starting collection lives in seed.json, shared with the React app and schema.sql.
const SEED = [
    ['book',  'The Fault in Our Stars', 'John Green', 2012, ''],
    ['book',  'A Good Book',            'Author Name', null, ''],
    ['vinyl', 'Abbey Road',             'The Beatles', 1969, ''],
    ['vinyl', 'Dark Side of the Moon',  'Pink Floyd', 1973, ''],
    ['movie', 'Inception',              'Christopher Nolan', 2010, ''],
    ['movie', 'The Matrix',             'The Wachowskis', 1999, ''],
];

// A problem the visitor can fix (empty bag, wrong test card...), sent back as a 422
final class UserError extends RuntimeException {}

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;

    $c = require __DIR__ . '/config.php';
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $c['host'], $c['port'], $c['name']);
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    ensure_schema($pdo);
    return $pdo;
}

// Upgrade a database made by an older version of schema.sql: add what's missing.
function ensure_schema(PDO $pdo): void
{
    $has = function (string $table, string $column) use ($pdo): bool {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
        $stmt->execute([$table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    };
    if (!$has('items', 'year')) {
        $pdo->exec('ALTER TABLE items ADD COLUMN year SMALLINT NULL AFTER creator');
    }
    if (!$has('items', 'description')) {
        $pdo->exec("ALTER TABLE items ADD COLUMN description TEXT NULL AFTER year");
    }
    $type = $pdo->query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'type'")->fetchColumn();
    if (is_string($type) && !str_contains($type, 'comic')) {
        $pdo->exec("ALTER TABLE items MODIFY type ENUM('book', 'vinyl', 'movie', 'manga', 'comic') NOT NULL");
    }
    $pdo->exec('CREATE TABLE IF NOT EXISTS members (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name        VARCHAR(80)  NOT NULL,
        email       VARCHAR(120) NOT NULL DEFAULT \'\',
        card_number VARCHAR(20)  NOT NULL,
        joined_at   DATETIME     NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB');
    if (!$has('loans', 'member_id')) {
        $pdo->exec('ALTER TABLE loans ADD COLUMN member_id INT UNSIGNED NULL AFTER item_id');
    }
    if (!$has('loans', 'fine_paid_cents')) {
        $pdo->exec('ALTER TABLE loans ADD COLUMN fine_paid_cents INT UNSIGNED NOT NULL DEFAULT 0');
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
        member_id    INT UNSIGNED NOT NULL,
        kind         ENUM('checkout', 'fines') NOT NULL,
        item_count   INT UNSIGNED NOT NULL DEFAULT 0,
        delivery     VARCHAR(16)  NOT NULL DEFAULT 'pickup',
        amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
        card_last4   CHAR(4)      NULL,
        created_at   DATETIME     NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_orders_member (member_id)
    ) ENGINE=InnoDB");
    $count = (int) $pdo->query('SELECT COUNT(*) FROM members')->fetchColumn();
    if ($count === 0) {
        $seed = seed_data();
        $pdo->prepare('INSERT INTO members (id, name, email, card_number, joined_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([MEMBER_ID, $seed['member']['name'], $seed['member']['email'] ?? '', card_number_for($seed['member']['name']), now()]);
        $pdo->exec('UPDATE loans SET member_id = ' . MEMBER_ID . ' WHERE member_id IS NULL');
    }
}

function now(int $offsetDays = 0): string
{
    return gmdate('Y-m-d H:i:s', time() + $offsetDays * 86400); // UTC, same format as the browser database
}

// A library card number like "2918 4402 7731", made from the member's name (same as the browser version)
function card_number_for(string $name): string
{
    $h = 2166136261;
    foreach (mb_str_split($name) as $ch) {
        $h = (($h ^ mb_ord($ch)) * 16777619) & 0xFFFFFFFF;
    }
    $n = str_pad((string) $h, 10, '0', STR_PAD_LEFT) . '73';
    return substr($n, 0, 4) . ' ' . substr($n, 4, 4) . ' ' . substr($n, 8, 4);
}

// Show a statement with its ? placeholders filled in, for the activity log
function show_sql(string $sql, array $params = []): string
{
    $i = 0;
    return preg_replace_callback('/\?/', function () use (&$i, $params) {
        $v = $params[$i++] ?? null;
        if ($v === null) return 'NULL';
        return is_int($v) ? (string) $v : "'" . str_replace("'", "''", (string) $v) . "'";
    }, trim($sql));
}

// Run a statement and return it as display text
function run(string $sql, array $params = []): string
{
    db()->prepare($sql)->execute($params);
    return show_sql($sql, $params) . ';';
}

function log_activity(string $message, string $sqlText): string
{
    db()->prepare('INSERT INTO activity (message, sql_text, created_at) VALUES (?, ?, ?)')
        ->execute([$message, $sqlText, now()]);
    return $message;
}

function find_item(int $id): ?array
{
    $stmt = db()->prepare(
        'SELECT i.id, i.type, i.title, i.creator, i.year, i.description, i.is_available, l.borrowed_at
         FROM items i
         LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
         WHERE i.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function seed_data(): array
{
    $file = __DIR__ . '/seed.json';
    $data = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    if (is_array($data) && array_is_list($data) && $data) {
        return ['member' => ['name' => 'Carlos Zabala', 'email' => ''], 'items' => $data, 'loans' => []];
    }
    if (is_array($data) && !empty($data['items'])) {
        return [
            'member' => $data['member'] ?? ['name' => 'Carlos Zabala', 'email' => ''],
            'items'  => $data['items'],
            'loans'  => $data['loans'] ?? [],
        ];
    }
    return ['member' => ['name' => 'Carlos Zabala', 'email' => ''], 'items' => SEED, 'loans' => []];
}

function seed(): void
{
    $data = seed_data();
    $rows = $data['items'];
    $stmt = db()->prepare('INSERT INTO items (type, title, creator, year, description, added_at) VALUES (?, ?, ?, ?, ?, ?)');
    $now = now();
    $lines = [];
    foreach ($rows as $i => $row) {
        $stmt->execute([$row[0], $row[1], $row[2], $row[3] ?? null, $row[4] ?? '', $now]);
        if ($i < 4) $lines[] = '  ' . show_sql('(?, ?, ?, ?)', [$row[0], $row[1], $row[2], $row[3] ?? null]);
    }
    // example loan history (one is overdue, so fines have something to show)
    foreach ($data['loans'] as $loan) {
        $find = db()->prepare('SELECT id FROM items WHERE title = ? LIMIT 1');
        $find->execute([$loan['title']]);
        $itemId = $find->fetchColumn();
        if (!$itemId) continue;
        $returned = $loan['returned_days_ago'] === null ? null : now(-(int) $loan['returned_days_ago']);
        db()->prepare('INSERT INTO loans (item_id, member_id, borrowed_at, returned_at) VALUES (?, ?, ?, ?)')
            ->execute([$itemId, MEMBER_ID, now(-(int) $loan['borrowed_days_ago']), $returned]);
        if ($returned === null) {
            db()->prepare('UPDATE items SET is_available = 0 WHERE id = ?')->execute([$itemId]);
        }
    }
    $more = count($rows) > 4 ? ",\n  -- ...and " . (count($rows) - 4) . ' more rows' : '';
    log_activity(
        'The library opened with ' . count($rows) . ' items.',
        "INSERT INTO items (type, title, creator, year) VALUES\n" . implode(",\n", $lines) . $more . ';'
    );
}

function body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '{}', true);
    return is_array($data) ? $data : [];
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['error' => 'Use POST for this action.'], 405);
    }
}

function check_demo_card(string $number): void
{
    if (preg_replace('/\D/', '', $number) !== DEMO_CARD) {
        throw new UserError('This is a demo checkout. Use the test card 4242 4242 4242 4242; no real card is ever charged.');
    }
}

// Overdue fine for one loan: $0.25 a day after the due date, capped at $5, minus what's been paid
function fine_cents(string $borrowedAt, ?string $returnedAt, int $paid): int
{
    $due = strtotime($borrowedAt . ' UTC') + LOAN_DAYS * 86400;
    $end = $returnedAt ? strtotime($returnedAt . ' UTC') : time();
    $days = (int) floor(($end - $due) / 86400);
    $accrued = $days > 0 ? min($days * FINE_PER_DAY_CENTS, FINE_CAP_CENTS) : 0;
    return max(0, $accrued - $paid);
}

// Borrow one item for the member. Returns [ok, message, sql, title]
function borrow_one(int $id): array
{
    $item = find_item($id);
    $check = show_sql('SELECT is_available FROM items WHERE id = ?', [$id]) . ';';
    if (!$item) return [false, 'Item not found.', $check, null];
    if ((int) $item['is_available'] !== 1) return [false, "{$item['title']} is currently not available.", $check, $item['title']];
    $s1 = run('UPDATE items SET is_available = 0 WHERE id = ?', [$id]);
    $s2 = run('INSERT INTO loans (item_id, member_id, borrowed_at) VALUES (?, ?, ?)', [$id, MEMBER_ID, now()]);
    return [true, "{$item['title']} has been borrowed.", "$s1\n$s2", $item['title']];
}

function profile_data(): array
{
    $member = db()->query('SELECT id, name, email, card_number, joined_at FROM members WHERE id = ' . MEMBER_ID)->fetch();
    $loans = db()->prepare(
        'SELECT l.id, l.item_id, i.title, i.type, i.creator, l.borrowed_at, l.returned_at, l.fine_paid_cents
         FROM loans l JOIN items i ON i.id = l.item_id
         WHERE l.member_id = ?
         ORDER BY l.id DESC'
    );
    $loans->execute([MEMBER_ID]);
    $orders = db()->prepare(
        'SELECT id, kind, item_count, delivery, amount_cents, card_last4, created_at
         FROM orders WHERE member_id = ? ORDER BY id DESC'
    );
    $orders->execute([MEMBER_ID]);
    return ['member' => $member, 'loans' => $loans->fetchAll(), 'orders' => $orders->fetchAll()];
}

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'ping':
            db();
            respond(['ok' => true]);

        case 'items': // "show"
            $count = (int) db()->query('SELECT COUNT(*) FROM items')->fetchColumn();
            $activity = (int) db()->query('SELECT COUNT(*) FROM activity')->fetchColumn();
            if ($count === 0 && $activity === 0) seed();
            // LEFT JOIN picks up the open loan (if any) so the page can show a due date
            $rows = db()->query(
                'SELECT i.id, i.type, i.title, i.creator, i.year, i.description, i.is_available, l.borrowed_at
                 FROM items i
                 LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
                 ORDER BY i.type, LOWER(i.title)'
            )->fetchAll();
            respond(['items' => $rows]);

        case 'item': // one item + its loan history
            $id = (int) ($_GET['id'] ?? 0);
            $item = find_item($id);
            if (!$item) throw new UserError('Item not found.');
            $sql = 'SELECT borrowed_at, returned_at FROM loans WHERE item_id = ? ORDER BY id DESC';
            $stmt = db()->prepare($sql);
            $stmt->execute([$id]);
            respond(['item' => $item, 'loans' => $stmt->fetchAll(), 'sql' => show_sql($sql, [$id]) . ';']);

        case 'activity':
            $rows = db()->query(
                'SELECT id, message, sql_text, created_at FROM activity ORDER BY id DESC LIMIT 30'
            )->fetchAll();
            respond(['activity' => $rows]);

        case 'profile':
            respond(profile_data());

        case 'borrow':
            require_post();
            $id = (int) (body()['id'] ?? 0);
            db()->beginTransaction();
            [$ok, $msg, $sql] = borrow_one($id);
            log_activity($msg, $sql);
            db()->commit();
            respond(['message' => $msg]);

        case 'return':
            require_post();
            $id = (int) (body()['id'] ?? 0);
            $item = find_item($id);
            $check = show_sql('SELECT is_available FROM items WHERE id = ?', [$id]) . ';';
            if (!$item) {
                respond(['message' => log_activity('Item not found.', $check)], 404);
            }
            db()->beginTransaction();
            if ((int) $item['is_available'] === 1) {
                $msg = log_activity("{$item['title']} was not borrowed.", $check);
            } else {
                $s1 = run('UPDATE items SET is_available = 1 WHERE id = ?', [$id]);
                $s2 = run('UPDATE loans SET returned_at = ? WHERE item_id = ? AND returned_at IS NULL', [now(), $id]);
                $msg = log_activity("{$item['title']} has been returned.", "$s1\n$s2");
            }
            db()->commit();
            respond(['message' => $msg]);

        case 'donate':
            require_post();
            $b = body();
            $type = (string) ($b['type'] ?? '');
            $title = trim((string) ($b['title'] ?? ''));
            $creator = trim((string) ($b['creator'] ?? ''));
            $year = isset($b['year']) && $b['year'] !== '' && $b['year'] !== null ? (int) $b['year'] : null;
            $description = trim((string) ($b['description'] ?? ''));
            if (!in_array($type, TYPES, true)) throw new UserError('Invalid item type.');
            if ($title === '' || $creator === '') throw new UserError('A title and a creator are both required.');
            if (mb_strlen($title) > 200 || mb_strlen($creator) > 200) throw new UserError('Keep the title and creator under 200 characters.');
            if ($year !== null && ($year < 1000 || $year > 2100)) throw new UserError('Use a four-digit year, like 1987.');
            if (mb_strlen($description) > 1000) throw new UserError('Keep the description under 1,000 characters.');
            $s = run('INSERT INTO items (type, title, creator, year, description, added_at) VALUES (?, ?, ?, ?, ?, ?)',
                [$type, $title, $creator, $year, $description, now()]);
            $line = match ($type) {
                'movie' => "directed by $creator",
                'comic' => "written by $creator",
                default => "by $creator",
            };
            respond(['message' => log_activity("$title $line has been donated to the library.", $s)]);

        case 'checkout': // borrow everything in the bag, record the order
            require_post();
            $b = body();
            $ids = array_slice(array_values(array_unique(array_map('intval', (array) ($b['ids'] ?? [])))), 0, MAX_PER_CHECKOUT);
            $delivery = ($b['delivery'] ?? 'pickup') === 'delivery' ? 'delivery' : 'pickup';
            if (!$ids) throw new UserError('Your bag is empty.');
            if ($delivery === 'delivery') check_demo_card((string) ($b['cardNumber'] ?? ''));

            db()->beginTransaction();
            $borrowed = [];
            $skipped = [];
            $sql = [];
            foreach ($ids as $id) {
                [$ok, $msg, $s, $title] = borrow_one($id);
                if ($ok) { $borrowed[] = $title; $sql[] = $s; } else { $skipped[] = $msg; }
            }
            if (!$borrowed) {
                db()->rollBack();
                throw new UserError($skipped[0] ?? 'Nothing in your bag could be borrowed.');
            }
            $charge = $delivery === 'delivery' ? count($borrowed) * DELIVERY_FEE_CENTS : 0;
            $sql[] = run(
                "INSERT INTO orders (member_id, kind, item_count, delivery, amount_cents, card_last4, created_at) VALUES (?, 'checkout', ?, ?, ?, ?, ?)",
                [MEMBER_ID, count($borrowed), $delivery, $charge, $charge > 0 ? substr(DEMO_CARD, -4) : null, now()]
            );
            $orderId = (int) db()->lastInsertId();
            $n = count($borrowed);
            $message = "Checked out $n item" . ($n > 1 ? 's' : '') . ': ' . implode(', ', $borrowed) . '.';
            log_activity($message, implode("\n", $sql));
            db()->commit();
            respond([
                'message'     => $message,
                'orderId'     => $orderId,
                'borrowed'    => $borrowed,
                'skipped'     => $skipped,
                'amountCents' => $charge,
                'delivery'    => $delivery,
                'dueDate'     => gmdate('c', time() + LOAN_DAYS * 86400),
            ]);

        case 'pay_fines':
            require_post();
            $owed = [];
            foreach (profile_data()['loans'] as $l) {
                $cents = fine_cents($l['borrowed_at'], $l['returned_at'], (int) $l['fine_paid_cents']);
                if ($cents > 0) $owed[] = [(int) $l['id'], $cents];
            }
            $total = array_sum(array_column($owed, 1));
            if ($total === 0) throw new UserError("You don't owe any fines.");
            check_demo_card((string) (body()['cardNumber'] ?? ''));
            db()->beginTransaction();
            $sql = [];
            foreach ($owed as [$loanId, $cents]) {
                $sql[] = run('UPDATE loans SET fine_paid_cents = fine_paid_cents + ? WHERE id = ?', [$cents, $loanId]);
            }
            $sql[] = run(
                "INSERT INTO orders (member_id, kind, item_count, delivery, amount_cents, card_last4, created_at) VALUES (?, 'fines', ?, 'none', ?, ?, ?)",
                [MEMBER_ID, count($owed), $total, substr(DEMO_CARD, -4), now()]
            );
            $msg = log_activity('Paid $' . number_format($total / 100, 2) . ' in fines. Thank you!', implode("\n", $sql));
            db()->commit();
            respond(['message' => $msg]);

        case 'profile_update':
            require_post();
            $b = body();
            $name = mb_substr(trim((string) ($b['name'] ?? '')), 0, 80);
            $email = mb_substr(trim((string) ($b['email'] ?? '')), 0, 120);
            if ($name === '') throw new UserError('Add your name.');
            $s = run('UPDATE members SET name = ?, email = ? WHERE id = ?', [$name, $email, MEMBER_ID]);
            respond(['message' => log_activity('Your profile was updated.', $s)]);

        case 'reset':
            require_post();
            db()->beginTransaction();
            db()->exec('DELETE FROM orders');
            db()->exec('DELETE FROM loans');
            db()->exec('DELETE FROM activity');
            db()->exec('DELETE FROM items');
            db()->exec('DELETE FROM members');
            $seed = seed_data();
            db()->prepare('INSERT INTO members (id, name, email, card_number, joined_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([MEMBER_ID, $seed['member']['name'], $seed['member']['email'] ?? '', card_number_for($seed['member']['name']), now()]);
            seed();
            db()->commit();
            respond(['message' => 'The library was reset.']);

        default:
            respond(['error' => 'Unknown action.'], 400);
    }
} catch (UserError $e) {
    if (db_started() && db()->inTransaction()) db()->rollBack();
    respond(['error' => $e->getMessage()], 422);
} catch (Throwable $e) {
    if (db_started() && db()->inTransaction()) db()->rollBack();
    error_log('[library] ' . $e->getMessage());
    respond(['error' => 'The database is not reachable. Check config.php and that database/schema.sql has been run.'], 500);
}

function db_started(): bool
{
    try { db(); return true; } catch (Throwable $e) { return false; }
}
