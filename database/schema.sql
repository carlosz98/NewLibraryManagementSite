-- Library of Tomorrow: MySQL / MariaDB schema
-- Run once in phpMyAdmin (XAMPP) or any MySQL 8 / MariaDB server:
--   mysql -u root -p < schema.sql
-- Safe to run again: tables are only created if missing, and the starting data
-- is only inserted into empty tables. (Upgrading a database from an older
-- version? api.php adds any missing tables and columns by itself.)
--
-- Design: "single table inheritance". The classes Book, Vinyl, Movie, Manga and Comic
-- all extend LibraryItem, so they share one `items` table. The `type` column
-- says which subclass a row is, and `creator` holds the author / artist / director / writer.

CREATE DATABASE IF NOT EXISTS library_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library_db;

CREATE TABLE IF NOT EXISTS items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type         ENUM('book', 'vinyl', 'movie', 'manga', 'comic') NOT NULL,
  title        VARCHAR(200) NOT NULL,
  creator      VARCHAR(200) NOT NULL,           -- author, artist, director or writer
  year         SMALLINT     NULL,               -- first published / released
  description  TEXT         NULL,               -- shown on the item's page
  is_available TINYINT(1)   NOT NULL DEFAULT 1, -- 1 = on the shelf, 0 = borrowed
  added_at     DATETIME     NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_items_type (type)
) ENGINE=InnoDB;

-- Library members. This demo has one: you.
CREATE TABLE IF NOT EXISTS members (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  email       VARCHAR(120) NOT NULL DEFAULT '',
  card_number VARCHAR(20)  NOT NULL,
  joined_at   DATETIME     NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- One row per borrow. returned_at stays NULL until the item comes back.
-- Fines: $0.25 per day past the 14-day due date, capped at $5 per loan.
CREATE TABLE IF NOT EXISTS loans (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id         INT UNSIGNED NOT NULL,
  member_id       INT UNSIGNED NULL,
  borrowed_at     DATETIME     NOT NULL,
  returned_at     DATETIME     NULL,
  fine_paid_cents INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_loans_open (item_id, returned_at),
  INDEX idx_loans_member (member_id),
  CONSTRAINT fk_loans_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Checkouts from the bag and fine payments. DEMO payments only:
-- nothing is charged and card numbers are never stored, just the last four digits.
CREATE TABLE IF NOT EXISTS orders (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id    INT UNSIGNED NOT NULL,
  kind         ENUM('checkout', 'fines') NOT NULL,
  item_count   INT UNSIGNED NOT NULL DEFAULT 0,
  delivery     VARCHAR(16)  NOT NULL DEFAULT 'pickup', -- pickup, delivery, none
  amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
  card_last4   CHAR(4)      NULL,
  created_at   DATETIME     NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_orders_member (member_id)
) ENGINE=InnoDB;

-- Activity log: what happened and the SQL that ran.
CREATE TABLE IF NOT EXISTS activity (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  message    VARCHAR(400) NOT NULL,
  sql_text   TEXT         NOT NULL,
  created_at DATETIME     NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- The member. (card_number matches what api.php would generate for this name.)
INSERT INTO members (id, name, email, card_number, joined_at)
SELECT 1, 'Carlos Zabala', '', '2360 9969 0473', UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM members);

-- Starting collection: the same rows as public/seed.json.
INSERT INTO items (type, title, creator, year, description, added_at)
SELECT type, title, creator, year, description, added_at FROM (
  SELECT 'x' AS type, 'x' AS title, 'x' AS creator, 0 AS year, 'x' AS description, UTC_TIMESTAMP() AS added_at FROM DUAL WHERE FALSE
  UNION ALL SELECT 'book'  , 'The Fault in Our Stars'            , 'John Green', 2012, 'Two teenagers who meet at a cancer support group fall in love and set out to find the reclusive author of their favorite novel.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'A Good Book'                       , 'Author Name', NULL, 'The placeholder volume from the original Java console version of this library, kept on the shelf for old times'' sake.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'One Hundred Years of Solitude'     , 'Gabriel García Márquez', 1967, 'Seven generations of the Buendía family rise and fall in the town of Macondo, where the miraculous is treated as ordinary.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Beloved'                           , 'Toni Morrison', 1987, 'In post-Civil War Ohio, a woman who escaped slavery is haunted by the daughter she lost, who seems to return in human form.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , '1984'                              , 'George Orwell', 1949, 'Winston Smith rewrites history for a state that watches everyone, and risks everything on a forbidden love affair.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Dune'                              , 'Frank Herbert', 1965, 'On the desert planet Arrakis, young Paul Atreides is caught in a struggle over the most valuable substance in the universe.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'The Left Hand of Darkness'         , 'Ursula K. Le Guin', 1969, 'An envoy to the icy planet Gethen, whose people have no fixed sex, has to learn trust across a deep cultural divide.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Pride and Prejudice'               , 'Jane Austen', 1813, 'Elizabeth Bennet and Mr. Darcy badly misjudge each other before slowly finding their way past pride and first impressions.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Things Fall Apart'                 , 'Chinua Achebe', 1958, 'Okonkwo, a proud Igbo leader, watches his world come apart as colonial rule and missionaries arrive in his village.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'The House on Mango Street'         , 'Sandra Cisneros', 1984, 'Esperanza Cordero grows up in a Latino neighborhood in Chicago, told in short, poetic vignettes.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Kindred'                           , 'Octavia E. Butler', 1979, 'A Black writer in 1976 Los Angeles is pulled back in time, again and again, to a plantation in antebellum Maryland.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Frankenstein'                      , 'Mary Shelley', 1818, 'Victor Frankenstein builds a living being and then abandons it, with tragic results for both of them.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'The Name of the Rose'              , 'Umberto Eco', 1980, 'A Franciscan friar investigates a string of deaths in a 14th-century abbey whose forbidden library sits at the heart of the mystery.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Neuromancer'                       , 'William Gibson', 1984, 'A burned-out hacker is hired for one last job in a future soaked in cyberspace. A founding novel of cyberpunk.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'Pedro Páramo'                      , 'Juan Rulfo', 1955, 'Juan Preciado travels to the village of Comala to find his father and finds a town full of whispering ghosts.', UTC_TIMESTAMP()
  UNION ALL SELECT 'book'  , 'The Bell Jar'                      , 'Sylvia Plath', 1963, 'Esther Greenwood''s summer internship in New York gives way to a deepening depression, in Plath''s only novel.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Akira'                             , 'Katsuhiro Otomo', 1982, 'In Neo-Tokyo, decades after a devastating war, a teenage biker gang member gains terrifying psychic powers.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Ghost in the Shell'                , 'Masamune Shirow', 1989, 'Major Motoko Kusanagi leads a cybercrime unit in a future where bodies are machines and minds can be hacked.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Nausicaä of the Valley of the Wind', 'Hayao Miyazaki', 1982, 'A princess tries to make peace between warring kingdoms and a spreading toxic forest full of giant insects.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Berserk'                           , 'Kentaro Miura', 1989, 'Guts, a lone mercenary with an enormous sword, fights his way through a dark medieval world shaped by betrayal and demons.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Monster'                           , 'Naoki Urasawa', 1994, 'A Japanese surgeon in Germany saves a young boy''s life, then learns years later that the boy has grown into a killer.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Vagabond'                          , 'Takehiko Inoue', 1998, 'A fictionalized retelling of the life of the legendary swordsman Miyamoto Musashi.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Uzumaki'                           , 'Junji Ito', 1998, 'A small coastal town is slowly consumed by an obsession with spirals. Horror at its strangest.', UTC_TIMESTAMP()
  UNION ALL SELECT 'manga' , 'Death Note'                        , 'Tsugumi Ohba', 2003, 'A student finds a notebook that kills anyone whose name is written in it, and a brilliant detective sets out to stop him.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'Watchmen'                          , 'Alan Moore', 1986, 'In an alternate 1985, retired costumed heroes are pulled back together by the murder of one of their own.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'Maus'                              , 'Art Spiegelman', 1986, 'Spiegelman records his father''s memories of surviving the Holocaust, drawing Jews as mice and Nazis as cats.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'Persepolis'                        , 'Marjane Satrapi', 2000, 'Marjane Satrapi''s memoir of growing up in Iran during and after the Islamic Revolution.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'The Sandman'                       , 'Neil Gaiman', 1989, 'Dream of the Endless escapes decades of captivity and sets out to rebuild his ruined realm.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'The Dark Knight Returns'           , 'Frank Miller', 1986, 'An aging Bruce Wayne comes out of retirement to face a Gotham City overrun by crime.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'Saga'                              , 'Brian K. Vaughan', 2012, 'Two soldiers from opposite sides of an endless war fall in love and go on the run with their newborn daughter.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'Hellboy: Seed of Destruction'      , 'Mike Mignola', 1994, 'A demon raised by humans investigates the paranormal, and the mystery of where he came from.', UTC_TIMESTAMP()
  UNION ALL SELECT 'comic' , 'Love and Rockets'                  , 'Jaime Hernandez', 1982, 'The long-running series by Los Bros Hernandez; Jaime''s stories follow Maggie and Hopey through the Southern California punk scene.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Abbey Road'                        , 'The Beatles', 1969, 'The last album the Beatles recorded together, closing with a long medley across side two.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Dark Side of the Moon'             , 'Pink Floyd', 1973, 'Pink Floyd''s concept album about time, money, pressure and madness.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Kind of Blue'                      , 'Miles Davis', 1959, 'Miles Davis''s modal jazz landmark, recorded with John Coltrane and Bill Evans.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Rumours'                           , 'Fleetwood Mac', 1977, 'Written while the band''s relationships were falling apart, and somehow full of hits.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'What''s Going On'                  , 'Marvin Gaye', 1971, 'A song cycle about war, poverty and the planet, told through the eyes of a returning veteran.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Blue'                              , 'Joni Mitchell', 1971, 'Joni Mitchell''s intimate, confessional album of songs about love and travel.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Unknown Pleasures'                 , 'Joy Division', 1979, 'Joy Division''s debut: stark, cold, atmospheric post-punk.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Purple Rain'                       , 'Prince and The Revolution', 1984, 'Prince and The Revolution''s soundtrack to the film of the same name.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'OK Computer'                       , 'Radiohead', 1997, 'Radiohead''s album about technology, alienation and modern life.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'The Miseducation of Lauryn Hill'   , 'Lauryn Hill', 1998, 'Lauryn Hill''s solo debut, blending hip hop, soul and reggae.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Disintegration'                    , 'The Cure', 1989, 'The Cure''s lush, slow, melancholy masterpiece.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Buena Vista Social Club'           , 'Buena Vista Social Club', 1997, 'Veteran Cuban musicians recorded in Havana, bringing son and bolero to listeners around the world.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Abraxas'                           , 'Santana', 1970, 'Santana''s second album, fusing rock guitar with Latin percussion.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Homogenic'                         , 'Björk', 1997, 'Strings and electronic beats inspired by the landscapes of Iceland.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Illmatic'                          , 'Nas', 1994, 'Nas''s debut, a vivid portrait of life in Queensbridge, Queens.', UTC_TIMESTAMP()
  UNION ALL SELECT 'vinyl' , 'Daydream Nation'                   , 'Sonic Youth', 1988, 'Sonic Youth''s sprawling double album of noise rock.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Inception'                         , 'Christopher Nolan', 2010, 'A thief who steals secrets from people''s dreams is hired to plant an idea instead.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'The Matrix'                        , 'The Wachowskis', 1999, 'A hacker learns the world he knows is a simulation and joins the fight against the machines that run it.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Spirited Away'                     , 'Hayao Miyazaki', 2001, 'A girl trapped in a world of spirits takes a job at a bathhouse to save her parents.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Pan''s Labyrinth'                  , 'Guillermo del Toro', 2006, 'In 1944 Spain, a girl escapes into a dark fairy-tale world while her stepfather hunts rebels in the hills.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Blade Runner'                      , 'Ridley Scott', 1982, 'A detective in a rain-soaked future Los Angeles hunts down escaped artificial humans.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Amélie'                            , 'Jean-Pierre Jeunet', 2001, 'A shy Parisian waitress secretly sets out to improve the lives of the people around her.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Parasite'                          , 'Bong Joon-ho', 2019, 'A struggling family schemes its way into working for a wealthy household, until everything spirals.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Casablanca'                        , 'Michael Curtiz', 1942, 'A nightclub owner in wartime Morocco must choose between his old love and helping her escape.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Roma'                              , 'Alfonso Cuarón', 2018, 'A year in the life of a live-in housekeeper for a middle-class family in 1970s Mexico City.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Metropolis'                        , 'Fritz Lang', 1927, 'In a towering future city split between the rich and the workers below, a young man takes the workers'' side.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'In the Mood for Love'              , 'Wong Kar-wai', 2000, 'Two neighbors in 1962 Hong Kong discover their spouses are having an affair, and slowly grow close.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Moonlight'                         , 'Barry Jenkins', 2016, 'Three chapters in the life of a young Black man growing up in Miami.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Seven Samurai'                     , 'Akira Kurosawa', 1954, 'A farming village hires seven samurai to defend it from bandits.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'The Shining'                       , 'Stanley Kubrick', 1980, 'A writer takes a winter job as caretaker of an isolated mountain hotel, with his wife and son.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'City of God'                       , 'Fernando Meirelles', 2002, 'A young photographer grows up amid gang wars in a Rio de Janeiro favela.', UTC_TIMESTAMP()
  UNION ALL SELECT 'movie' , 'Alien'                             , 'Ridley Scott', 1979, 'The crew of a space freighter answers a distress call and brings back something deadly.', UTC_TIMESTAMP()
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM items);

-- Example loan history: two returned, one overdue (so fines have something to show).
INSERT INTO loans (item_id, member_id, borrowed_at, returned_at)
SELECT i.id, 1, h.borrowed_at, h.returned_at
FROM (
  SELECT 'x' AS title, UTC_TIMESTAMP() AS borrowed_at, UTC_TIMESTAMP() AS returned_at FROM DUAL WHERE FALSE
  UNION ALL SELECT 'Kind of Blue', UTC_TIMESTAMP() - INTERVAL 40 DAY, UTC_TIMESTAMP() - INTERVAL 30 DAY
  UNION ALL SELECT 'Persepolis', UTC_TIMESTAMP() - INTERVAL 26 DAY, UTC_TIMESTAMP() - INTERVAL 15 DAY
  UNION ALL SELECT 'Uzumaki', UTC_TIMESTAMP() - INTERVAL 20 DAY, NULL
) AS h
JOIN items i ON i.title = h.title
WHERE NOT EXISTS (SELECT 1 FROM loans);

UPDATE items i JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
SET i.is_available = 0;

-- Handy queries to practice with:
-- Everything on the shelf right now
--   SELECT type, title, creator FROM items WHERE is_available = 1 ORDER BY type, title;
-- How many of each type
--   SELECT type, COUNT(*) AS total, SUM(is_available) AS on_shelf FROM items GROUP BY type;
-- Items currently out, with their due date
--   SELECT i.title, l.borrowed_at, l.borrowed_at + INTERVAL 14 DAY AS due
--   FROM loans l JOIN items i ON i.id = l.item_id
--   WHERE l.returned_at IS NULL;
-- Overdue loans and their fines ($0.25 a day, capped at $5)
--   SELECT i.title,
--          DATEDIFF(UTC_TIMESTAMP(), l.borrowed_at + INTERVAL 14 DAY) AS days_late,
--          LEAST(DATEDIFF(UTC_TIMESTAMP(), l.borrowed_at + INTERVAL 14 DAY) * 25, 500) / 100 AS fine_dollars
--   FROM loans l JOIN items i ON i.id = l.item_id
--   WHERE l.returned_at IS NULL AND UTC_TIMESTAMP() > l.borrowed_at + INTERVAL 14 DAY;
-- Most borrowed items
--   SELECT i.title, COUNT(l.id) AS times_borrowed
--   FROM items i LEFT JOIN loans l ON l.item_id = i.id
--   GROUP BY i.id ORDER BY times_borrowed DESC LIMIT 5;
-- Orders and what they cost
--   SELECT kind, item_count, delivery, amount_cents / 100 AS dollars, created_at FROM orders ORDER BY id DESC;
