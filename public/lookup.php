<?php
// Library of Tomorrow: online catalog lookup (server-side proxy)
//
//   GET lookup.php?type=book&q=dune      -> Open Library
//   GET lookup.php?type=vinyl&q=abbey    -> MusicBrainz (release groups)
//   GET lookup.php?type=movie&q=alien    -> Wikidata (items described as films)
//   GET lookup.php?type=manga&q=akira    -> Open Library
//   GET lookup.php?type=comic&q=maus     -> Open Library
//
// Returns { results: [ { title, creator, year }, ... ] }
// Titles, names and years only; no cover art.
//
// Why a proxy: MusicBrainz asks every application to send a meaningful
// User-Agent and to stay under one request per second. Browsers can't set
// User-Agent, so on a PHP server the page calls this file instead.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const USER_AGENT = 'LibraryOfTomorrow/1.0 (https://github.com/carlosz98/Library-Management-System---Java)';

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function get_json(string $url): array
{
    $context = stream_context_create([
        'http' => [
            'method'  => 'GET',
            'header'  => "User-Agent: " . USER_AGENT . "\r\nAccept: application/json\r\n",
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        throw new RuntimeException('The catalog could not be reached.');
    }
    $data = json_decode($body, true);
    if (!is_array($data)) {
        throw new RuntimeException('The catalog sent back something unexpected.');
    }
    return $data;
}

// Keep MusicBrainz happy: at most one request per second from this server
function musicbrainz_throttle(): void
{
    $stamp = sys_get_temp_dir() . '/library_mb_last_call';
    $last = is_file($stamp) ? (float) file_get_contents($stamp) : 0.0;
    $wait = 1.0 - (microtime(true) - $last);
    if ($wait > 0) usleep((int) ($wait * 1_000_000));
    @file_put_contents($stamp, (string) microtime(true));
}

function search_books(string $q): array
{
    $url = 'https://openlibrary.org/search.json?' . http_build_query([
        'q' => $q, 'fields' => 'title,author_name,first_publish_year', 'limit' => 8,
    ]);
    $out = [];
    foreach (get_json($url)['docs'] ?? [] as $d) {
        $out[] = [
            'title'   => (string) ($d['title'] ?? ''),
            'creator' => (string) ($d['author_name'][0] ?? 'Unknown author'),
            'year'    => isset($d['first_publish_year']) ? (string) $d['first_publish_year'] : '',
        ];
    }
    return $out;
}

function search_albums(string $q): array
{
    musicbrainz_throttle();
    $url = 'https://musicbrainz.org/ws/2/release-group/?' . http_build_query([
        'query' => $q, 'fmt' => 'json', 'limit' => 15,
    ]);
    $groups = get_json($url)['release-groups'] ?? [];
    $albums = array_values(array_filter($groups, fn($g) => ($g['primary-type'] ?? '') === 'Album'));
    $out = [];
    foreach (array_slice($albums ?: $groups, 0, 8) as $g) {
        $artist = '';
        foreach ($g['artist-credit'] ?? [] as $credit) {
            $artist .= ($credit['name'] ?? '') . ($credit['joinphrase'] ?? '');
        }
        $out[] = [
            'title'   => (string) ($g['title'] ?? ''),
            'creator' => $artist !== '' ? $artist : 'Unknown artist',
            'year'    => substr((string) ($g['first-release-date'] ?? ''), 0, 4),
        ];
    }
    return $out;
}

function search_films(string $q): array
{
    $url = 'https://www.wikidata.org/w/api.php?' . http_build_query([
        'action' => 'wbsearchentities', 'search' => $q, 'language' => 'en', 'uselang' => 'en',
        'type' => 'item', 'limit' => 20, 'format' => 'json',
    ]);
    $out = [];
    foreach (get_json($url)['search'] ?? [] as $hit) {
        $desc = (string) ($hit['description'] ?? '');
        if (!preg_match('/\bfilm\b/i', $desc)) continue;
        // e.g. "2010 film by Christopher Nolan" or "1942 American film directed by Michael Curtiz"
        $director = preg_match('/\bby (.+)$/i', $desc, $m) ? trim($m[1]) : 'Unknown director';
        $year = preg_match('/\b(1[89]\d\d|20\d\d)\b/', $desc, $y) ? $y[1] : '';
        $out[] = ['title' => (string) ($hit['label'] ?? ''), 'creator' => $director, 'year' => $year];
        if (count($out) === 8) break;
    }
    return $out;
}

$type = (string) ($_GET['type'] ?? '');
$q = trim((string) ($_GET['q'] ?? ''));

if ($q === '' || mb_strlen($q) > 120) {
    respond(['error' => 'Type a title or name (up to 120 characters).'], 422);
}

try {
    $results = match ($type) {
        'book', 'manga', 'comic' => search_books($q),
        'vinyl' => search_albums($q),
        'movie' => search_films($q),
        default => respond(['error' => 'Invalid item type.'], 422),
    };
    respond(['results' => array_values(array_filter($results, fn($r) => $r['title'] !== ''))]);
} catch (Throwable $e) {
    error_log('[library lookup] ' . $e->getMessage());
    respond(['error' => $e->getMessage()], 502);
}
