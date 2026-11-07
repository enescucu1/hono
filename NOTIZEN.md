# Notizen zur Aufgabe 3: Appserver mit Hono, TypeScript und Drizzle

Gruppe 2, Enes Cubukcu und Sai Kujala. GitHub: `https://github.com/enescucu1/hono` (öffentlich).
Zeiterfassung (nur Enes) und Projektplan (Sai und Enes) kommen in eine Excel-Datei wie bei Aufgabe 1.

Letzter Stand: 7.11.2026, abends (Enes)

## Übergabe an Sai: Vitest-Integrationstests

Sai macht als Nächstes die **Integrationstests mit Vitest** für die REST-Schnittstelle (Folie: "Vitest mit Fetch API für Integrationstests"). Der REST-Teil ist fertig, die Routen stehen im Abschnitt "REST-Schnittstelle".

### Vorher prüfen

- [x] Pull Request #4 (POST) und #5 (PUT, DELETE, ETag) sind in `main` gemergt (7.11., die Konflikte in drei Dateien waren gelöst)
- [ ] Nach `git checkout main` und `git pull` enthält `src/rezept/rest/rezept-write.router.mts` die Routen `PUT` und `DELETE` (zum Beispiel mit `Select-String "put|delete" src\rezept\rest\rezept-write.router.mts`)
- [ ] Projekt eingerichtet (Abschnitt "Projekt einrichten") und `pnpm run dev` läuft, `http://localhost:3000/rest/20` liefert das Rezept "Pfannkuchen"

### Vorgehen

1. Branch `feature/vitest-integration` von `main`
2. Vitest installieren: erst mit `pnpm view vitest version` die aktuelle Version ansehen (am 7.11. war `latest` 5.1.0), dann `pnpm add -D vitest@<Version>`. Ob diese Version mit Node 26 und TypeScript 7.1 beta läuft, ist **nicht geprüft**
3. Konfiguration `vitest.config.mts` im Wurzelverzeichnis. Vitest verlangt dort einen Default-Export, deshalb wie bei `drizzle.config.ts` die Zeile `// oxlint-disable-next-line import/no-default-export` davor. Datei in `include` der `tsconfig.json` aufnehmen, sonst meldet Oxlint wie bei `drizzle.config.ts` den Fehler `TS2591`
4. In der `package.json` das Script `test` ersetzen (steht dort noch `echo Keine Tests`), zum Beispiel durch `vitest run`
5. Testdateien in `test/integration/rezept/` (so sieht es der Override in `oxlint.config.mts` vor: `test/integration/*/*.test.mts`), zum Beispiel `rest-get.test.mts` und `rest-write.test.mts`
6. Wie üblich: `pnpm exec oxfmt`, `pnpm run lint`, `pnpm run tsc`, dann Commit, Pull Request, Enes mergt

### Regeln für die Tests (aus `oxlint.config.mts`)

- `import { describe, expect, test } from 'vitest'` (nicht die Globals nutzen, die Regel `no-importing-vitest-globals` ist aus, aber das Projekt importiert explizit)
- `test` statt `it` in `describe`-Blöcken (`vitest/consistent-test-it`)
- Als Hooks nur `beforeAll` und `beforeEach` (`vitest/no-hooks`)
- `expect.assertions(n)` bei Tests mit `expect` in einer Schleife (`vitest/prefer-expect-assertions`)
- Statuscodes wie 200, 201, 204, 304, 404, 412, 422, 428 sind für `no-magic-numbers` erlaubt, andere Zahlen als `const` benennen

### Wie die Tests ablaufen sollen

- Die Tests rufen mit der Fetch API (`fetch`, in Node 26 eingebaut) den **laufenden** Server auf `http://localhost:3000` auf. Voraussetzung: PostgreSQL und `pnpm run dev` laufen (wie bei Aufgabe 1: Backend und Appserver laufen, dann `pnpm test`)
- Fehlerantworten haben die Form `{ "message": "...", "details": ... }`, bei 422 steht in `details` das Ergebnis von `z.flattenError`
- `204` und `304` haben keinen Body. Header lesen mit `response.headers.get('etag')` und `response.headers.get('location')`
- **Testdaten:** Tests, die Daten ändern (POST, PUT, DELETE), legen sich ihr Rezept selbst per `POST` an (zufällige Rezeptnummer, Format `RZ-` plus 3 bis 6 Ziffern, zum Beispiel `RZ-` plus sechs zufällige Ziffern) und räumen mit `DELETE` auf. Lesetests nutzen die Seed-Rezepte (siehe "Testdaten")
- Nicht auf Version `0` eines Seed-Rezepts prüfen: Die Version kann durch `beispiele-write.mts` oder durch Tests in Bruno schon erhöht sein

### Testfälle (Vorschlag)

Alles davon wurde von Enes und Claude von Hand (curl und Bruno) gegen die Seed-Daten geprüft. Die Tests selbst sind **noch nicht geschrieben**.

GET (Suche und Einzelabfrage):

- [ ] `GET /rest/1`: 200, JSON mit `id`, `rezeptnummer`, `kosten` als Zahl, `titel.titel` und `zutaten` als Array, Header `etag` (zum Beispiel `"0"`)
- [ ] `GET /rest/1` mit `If-None-Match` gleich dem ETag: 304
- [ ] `GET /rest/4711` und `GET /rest/abc`: 404
- [ ] `GET /rest`: 200, höchstens 5 Rezepte, jedes mit `titel`
- [ ] `GET /rest?titel=suppe`: 200, Titel enthält "suppe" (Groß- und Kleinschreibung egal: `SUPPE` findet dasselbe)
- [ ] `GET /rest?vegetarisch=true&schwierigkeit=EINFACH`: alle Treffer sind vegetarisch und `EINFACH`
- [ ] `GET /rest?seite=2&groesse=3`: höchstens 3 Rezepte
- [ ] `GET /rest?titel=gibtesnicht`: 404
- [ ] Ungültige Suche: `?schwierigkeit=XXX`, `?titl=suppe` (Tippfehler), `?groesse=100`, `?vegetarisch=vielleicht`: jeweils 422

POST:

- [ ] Gültiger Body mit allen Feldern: 201, Header `location`, `GET` auf diese Adresse liefert 200 mit Titel und Zutaten
- [ ] Minimaler Body (nur Pflichtfelder): 201
- [ ] Gleiche Rezeptnummer noch einmal: 422
- [ ] Ungültige Daten (Rezeptnummer `XY-1`, Bewertung 9, Kosten -1, Zubereitungszeit 0, leerer Titel, leere Zutatenliste): 422
- [ ] Kein JSON im Body und unbekannte Property: 422

PUT (immer mit `If-Match`):

- [ ] Ohne `If-Match`: 428
- [ ] `If-Match` in falscher Form (`abc`): 412. Veraltete Version: 412
- [ ] Ungültiger Body: 422. `rezeptnummer` im Body: 422
- [ ] Unbekannte ID mit korrektem Header: 404
- [ ] Richtige Version: 204 und Header `etag` mit Version plus 1
- [ ] Danach `GET`: neue Version, neuer Titel, neue Zutaten, nicht angegebene optionale Werte `null`
- [ ] Dasselbe `PUT` noch einmal mit der alten Version: 412

DELETE:

- [ ] `DELETE /rest/<id>`: 204, danach `GET` 404
- [ ] Noch einmal und `DELETE /rest/abc`: jeweils 204

## Projekt einrichten (für Sai)

Pfad wie bei Enes `C:\workspace\javascript\...` (nicht in einem Pfad mit Leerzeichen).

1. **Voraussetzungen:** Docker Desktop, Git, Node 26 (aus der `Zimmermann.zip` in ILIAS, `C:\Zimmermann\node`), pnpm mindestens 12.18 (`pnpm self-update` **außerhalb** des Projektordners ausführen, sonst bricht `pmOnFail: error` ab), Bun optional. Node 26.10 und Bun 1.4.2 reichen, es gibt nur Warnungen
2. **Klonen:** `git clone https://github.com/enescucu1/hono.git`, dann `cd hono`
3. **Pakete:** `pnpm i`. Den Hinweis "Agent skills awaiting approval: drizzle-kit" ignorieren, kein `pnpm approve`
4. **`.env` anlegen** (nicht im Repository, jeder hat seine eigene). Inhalt nach dem Vorbild von `ReadMe.drizzle.md` und `ReadMe.vscode.md`:
   - `NODE_ENV=development`
   - `NODE_TLS_REJECT_UNAUTHORIZED=0`
   - `DATABASE_URL` und `DATABASE_URL_ADMIN` für die Datenbank `rezept` mit Schema `rezept`, User `rezept` bzw. `postgres`, `sslnegotiation=direct` und `sslcert=src/config/postgresql/server.crt`. Das Passwort des Users `rezept` steht in `extras/compose/postgres/init/rezept/sql/create-db.sql`
5. **PostgreSQL mit der Datenbank `rezept`:**
   - Wer PostgreSQL aus Aufgabe 1 schon hat (Volumes `pg_data`, `pg_init`, `pg_tablespace`), baut **keinen** zweiten Container auf (gleicher Containername und Port 5432). Nur `init/rezept` ins Volume `pg_init` kopieren und das Verzeichnis `/tablespace/rezept` anlegen. Dafür im Ordner `extras\compose\postgres` den folgenden Befehl ausführen und `<Image>` durch ein lokal vorhandenes Postgres-Image ersetzen (Enes: `postgres:19beta4-trixie`):

     ```powershell
     docker run --rm -u 0 --entrypoint '' `
       -v pg_init:/init -v pg_tablespace:/tablespace -v ./init:/tmp/init:ro `
       <Image> bash -c "cp -r /tmp/init/rezept /init/; mkdir -p /tablespace/rezept; chown -R postgres:postgres /init /tablespace; chmod 400 /init/rezept/sql/* /init/rezept/csv/*; ls -lR /init/rezept"
     ```

   - Postgres starten (`docker compose up -d`, warten bis `healthy`) und im selben Ordner die Datenbank anlegen. Passwörter: das eigene für `postgres`, das aus `create-db.sql` für `rezept`:

     ```powershell
     docker compose exec postgres psql --dbname=postgres --username=postgres --file=/init/rezept/sql/create-db.sql
     docker compose exec postgres psql --dbname=rezept --username=rezept --file=/init/rezept/sql/create-schema.sql
     docker compose exec postgres psql --dbname=rezept --username=rezept --file=/init/rezept/sql/create-table.sql
     docker compose exec postgres psql --dbname=rezept --username=postgres --file=/init/rezept/sql/copy-csv.sql
     ```

     Erwartet: `COPY 9`, `COPY 9`, `COPY 19`
   - Wer noch keinen Postgres hat: `extras/compose/postgres/ReadMe.md` durcharbeiten und überall `buch` durch `rezept` ersetzen
6. **Prüfen:** `pnpm run lint` und `pnpm run tsc` ohne Fehler, dann `pnpm run dev` und im Browser `http://localhost:3000/rest/20`

## Stand der Arbeit

### Gemergte Pull Requests

| Nr. | Inhalt |
|---|---|
| #1 | Rezept-Datenbank (SQL, CSV, ER-Diagramm), Drizzle-Schema und Relations, Beispiele, Lint und Notizen |
| #2 | Hono-Gerüst: `src/config`, `src/rezept/service`, `src/rezept/rest`, `src/server.mts`, `GET /rest/:id` |
| #3 | Suche `GET /rest` mit Query-Parametern und Zod |
| #4 | `POST /rest` mit Zod, Anlegen von Rezept, Titel und Zutaten in einer Transaktion |
| #5 | `PUT`, `DELETE` und ETag (If-Match, If-None-Match), dazu die Übergabe-Notizen |

### REST-Schnittstelle

Server: `http://localhost:3000` (HTTP, siehe "TLS" bei Offen).

| Methode und Pfad | Erfolg | Fehler |
|---|---|---|
| `GET /rest?titel&schwierigkeit&vegetarisch&seite&groesse` | 200, Array mit Titel je Rezept, 5 pro Seite (maximal 20), sortiert nach ID | 404 keine Treffer, 422 ungültige oder unbekannte Parameter |
| `GET /rest/:id` | 200 mit Titel und Zutaten, Header `ETag: "<Version>"`, 304 bei passendem `If-None-Match` | 404 |
| `POST /rest` | 201 ohne Body, Header `Location` | 422 (ungültige Daten, unbekannte Property, kein JSON, doppelte Rezeptnummer) |
| `PUT /rest/:id` mit `If-Match: "<Version>"` | 204, Header `ETag` mit neuer Version | 404, 412 (falsche Form oder veraltete Version), 422, 428 (Header fehlt) |
| `DELETE /rest/:id` | 204, immer, auch wenn es das Rezept nicht gibt | |

Beispiel für den Body von `POST` (bei `PUT` ohne `rezeptnummer`):

```json
{
  "rezeptnummer": "RZ-200",
  "bewertung": 4,
  "schwierigkeit": "MITTEL",
  "kosten": 12.5,
  "zubereitungszeit": 40,
  "vegetarisch": true,
  "datum": "2026-03-01",
  "quelle": "https://beispiel.de/rezept",
  "schlagwoerter": ["SUPPE", "TEST"],
  "titel": { "titel": "Kuerbissuppe", "untertitel": "Mit Ingwer" },
  "zutaten": [
    { "bezeichnung": "Kuerbis", "menge": 800, "einheit": "g" },
    { "bezeichnung": "Ingwer", "menge": 1.5, "einheit": "Stueck" }
  ]
}
```

Pflicht sind `rezeptnummer` (Format `RZ-123`), `bewertung` (0 bis 5), `kosten`, `zubereitungszeit` (Minuten), `titel.titel` und mindestens eine Zutat. Optional sind `schwierigkeit`, `vegetarisch` (Standard `false`), `datum`, `quelle`, `schlagwoerter` und `titel.untertitel`.

### Bruno-Collection (extras/bruno/javascript)

Collection `rezept` mit 32 Requests im Stil der Collection `patient` aus Aufgabe 1. Öffnen in Bruno: **Open Collection** und den Ordner `extras\bruno\javascript` wählen. Voraussetzung: PostgreSQL und `pnpm run dev` laufen. Die Adresse steht in der Collection-Variable `baseUrl` (`http://localhost:3000`), eine Environment ist nicht nötig.

- `REST > Suche mit ID`: GET mit ID 1, 20, 30, unbekannter und ungültiger ID, `If-None-Match` (304)
- `REST > Suche mit Suchparameter`: 11 Requests (Alle, Seite 2, Titel, vegetarisch, ungültige Parameter mit 422, kein Treffer mit 404)
- `REST > Neu anlegen`: POST mit zufälliger Rezeptnummer (wiederholbar), doppelte Nummer, ungültige Daten, unbekannte Property, kein JSON
- `REST > Ändern`: PUT mit `If-Match`, falsche oder fehlende Version, kaputter Header, unbekannte ID, ungültige Daten, Rezeptnummer im Body
- `REST > Löschen`: DELETE für Rezept 50, das neu angelegte Rezept und eine unbekannte ID

Zusammenhang der Requests: `Vorhandene ID 30` merkt den ETag in der Variable `etag`, die PUT-Requests schicken ihn als `If-Match` und aktualisieren ihn nach Erfolg. `Neues Rezept` merkt die ID aus dem Header `Location` in `neueId` (für `Neu angelegtes Rezept löschen`) und die Rezeptnummer in `rezeptnummer` (für den Request mit doppelter Nummer). Jeder Request hat Assertions. Mit der Bruno-CLI 4.3.0 gegen die Seed-Daten geprüft: 32 von 32 Requests und 48 von 48 Assertions bestanden, auch beim zweiten Durchlauf.

Die Testfälle für Vitest (siehe oben) entsprechen dieser Collection.

### Code-Struktur

```text
src/
  config/db.mts, server.mts          Drizzle-Client und Port (Konstanten, kein process.env)
  db/schema.mts, relations.mts       Tabellen und Relationen (titel, zutaten, rezept)
  rezept/rest/                       Hono-Router und Zod-Schemas
  rezept/service/                    Zugriff auf die DB (Lesen und Schreiben)
  server.mts                         startet den Server
  beispiele.mts, beispiele-write.mts Beispiele des Dozenten, auf Rezept umgestellt
```

### Testdaten

Die CSV-Dateien in `extras/compose/postgres/init/rezept/csv` legen 9 Rezepte (IDs 1, 20, 30, 40, 50, 60, 70, 80, 90), 9 Titel und 19 Zutaten an. Rezept 20 hat keinen Untertitel, Rezept 90 keine Schwierigkeit, kein Datum, keine Quelle und keine Schlagwörter (zum Testen von `null`). Danach geänderte Daten (zum Beispiel durch `beispiele-write.mts` oder Bruno) bleiben in der DB, bis man sie neu lädt.

## Entscheidungen

- Beispiel-Domäne: **Rezept** mit Titel (1:1) und Zutat (1:n) statt Buch, Titel und Abbildung
- OR-Mapping mit **Drizzle** statt Prisma (die Folie ist veraltet, Drizzle hat mehr Downloads)
- Package Manager: **pnpm** (nicht npm, performanter), Runtime Node und Bun
- Die PlantUML-Diagramme aus Aufgabe 2 sind in dieser Aufgabe enthalten
- Arbeitsweise im Team: Feature-Branches mit Pull Requests, Enes mergt selbst
- Hono 5.0.0-rc.0 mit `@hono/node-server` 2.1.6 (die Version steht in `pnpm-workspace.yaml` bei `minimumReleaseAgeExclude`), Bestätigung durch den Dozenten offen
- Suche liefert 404, wenn nichts gefunden wird (wie `GET /rest/:id`). Ungültige Eingaben liefern 422 mit den Fehlern von Zod
- `PUT` ersetzt Rezept, Titel und alle Zutaten (nicht angegebene optionale Werte werden `NULL`). Die Rezeptnummer ist unveränderlich
- Optimistische Synchronisation über die Spalte `version` mit `ETag` und `If-Match`
- Rezept, Titel und Zutaten werden beim Anlegen und Ändern in einer Transaktion geschrieben

## Regeln des Dozenten

| Regel | Umsetzung |
|---|---|
| ECMAScript ab 2015 nutzen | Destructuring, Shorthand Properties, `async`/`await` |
| `const` zuerst, `let` nur wenn nötig, kein `var` | `var` ist function scoped |
| Immer `===` und `!==` | keine Typumwandlung, `eqeqeq` in `oxlint.config.mts` |
| Kein Default-Export, Import mit `{ }` | Ausnahme nur, wenn ein Tool es verlangt (zum Beispiel `drizzle.config.ts`, `oxlint.config.mts`) |
| Einfache Anführungszeichen, Semikolon | `singleQuote: true` in Oxfmt, `@stylistic/semi` in Oxlint |
| Zahlen immer als `number` | bei Drizzle `numeric({ mode: 'number' })`, sonst kommt ein String |
| Keine Enums, keine Constructor Properties | Type Stripping, stattdessen Union Types mit String-Literalen. `erasableSyntaxOnly` in tsc |
| Regeln werden in `oxlint.config.mts` definiert | |

## Hintergrund zu den Regeln (Frage, Antwort)

- **Warum kein Default-Export?** Beim Import sieht man nicht, was importiert wird, weil man den Namen frei ändern kann.
- **Warum Typdefinitionen (zum Beispiel `@types/node`), wenn Node in JavaScript geschrieben ist?** Sie beschreiben die Typen für Editor und `tsc` und helfen, Fehler zu vermeiden. Zur Laufzeit sind Typen **nicht** mehr vorhanden, Node schneidet sie beim Type Stripping weg.
- **Warum keine Enums und Constructor Properties?** Beide erzeugen echten JavaScript-Code und lassen sich beim Type Stripping nicht einfach wegschneiden.
- **Was ist `const`?** Die Variable kann nicht neu zugewiesen werden. Der Inhalt eines Objekts oder Arrays kann sich trotzdem ändern.
- **Drei Teile der `package.json`:** `dependencies`, `devDependencies` und `scripts` (Abkürzungen für Befehle, wie bei `pyproject.toml`).
- **Wozu `ETag` und `If-Match`?** Zwei Clients ändern nicht unbemerkt dasselbe Rezept. Der Client schickt die Version mit, die er gelesen hat. Ist sie veraltet, lehnt der Server mit 412 ab.

## Modell: Rezept

| Tabelle | Spalten | Entspricht beim Dozenten |
|---|---|---|
| `rezept` | `id`, `version`, `rezeptnummer` (eindeutig), `bewertung` (0 bis 5), `schwierigkeit` (EINFACH, MITTEL, SCHWER), `kosten`, `zubereitungszeit` (Minuten), `vegetarisch`, `datum`, `quelle`, `schlagwoerter` (jsonb), `erzeugt`, `aktualisiert` | `buch` |
| `titel` | `id`, `titel`, `untertitel`, `rezept_id` (1:1, eindeutig) | `titel` |
| `zutat` | `id`, `bezeichnung`, `menge`, `einheit`, `rezept_id` (1:n, mit Index) | `abbildung` |

`rabatt` und `buch_file` entfallen. `schwierigkeit` ist in der DB ein Postgres-Enum (`schwierigkeitsgrad`), im Code ein Union Type.

## Beobachtungen und Stolpersteine

- `numeric` kommt bei Drizzle als **String** zurück (`"11.10"`), für `number` ist `mode: 'number'` nötig
- Die Warnung zu `NODE_TLS_REJECT_UNAUTHORIZED=0` kommt aus der `.env` und ist nur für die lokale Entwicklung mit dem selbst signierten Zertifikat gedacht
- `src/config/postgresql/server.crt` und `extras/compose/postgres/init/tls/server.crt` sind identisch und gültig bis **07.02.2027**
- In der Zip passen die Postgres-Image-Tags nicht zusammen (`compose.yml`: `postgres:19rc1-trixie`, ReadMe: `dhi.io/postgres:19.0-debian13`). Enes startet Postgres deshalb aus dem FastAPI-Ordner mit `postgres:19beta4-trixie`
- `ER-Diagramm.plantuml` des Dozenten war veraltet und ist für Rezept neu geschrieben
- Das Script `pnpm run drizzle-kit-pull` gibt es nicht, der Befehl lautet `pnpm exec drizzle-kit pull`
- `pnpm self-update` nur **außerhalb** des Projektordners ausführen
- Docker Desktop muss laufen, sonst meldet `docker` einen Fehler zur Verbindung mit der Docker-API
- Oxlint, `sort-imports`: erst Imports mit mehreren Namen, dann mit einem Namen, innerhalb jeder Gruppe nach dem ersten Namen sortiert (Großbuchstaben vor Kleinbuchstaben)
- Oxlint, `TS2591` für `drizzle.config.ts`: die Datei steht deshalb im `include` der `tsconfig.json`. Das gilt später auch für `vitest.config.mts`
- Oxlint verbietet `process.env` (`node/no-process-env`), deshalb steht die Konfiguration als Konstanten in `src/config/*.mts`
- `arrow-body-style` verlangt bei Arrow-Functions, die ein Objekt zurückgeben, einen Block mit `return`, auch bei `map`
- `id-length` verbietet einstellige Namen (Ausnahmen nur `c`, `i`, `T`, `_`). Deshalb heißt der Parameter in `relations.mts` `rel` statt `r`
- Relationsnamen in `relations.mts` erscheinen im JSON der Schnittstelle, deshalb `titel`, `zutaten` und `rezept`
- `@tsconfig/strictest` hat `exactOptionalPropertyTypes`: Drizzle akzeptiert in `where` kein `undefined`. Nur vorhandene Suchkriterien kommen per Spread in den Filter
- Zod 4: `z.strictObject` lehnt unbekannte Parameter ab, `z.stringbool()` wandelt `"true"` und `"false"` aus der Query um, `z.flattenError` liefert die Fehler für die Antwort
- `c.req.json().catch(() => undefined)` verhindert einen Fehler 500 bei ungültigem JSON
- `beispiele-write.mts` verändert Daten (Rezept 30 und 70, neues Rezept 1000) und nicht zweimal ausführen, die Rezeptnummer `RZ-100` ist eindeutig
- Die `.env` ist nicht im Repository (jeder hat seine eigene, später mit eigenem Keycloak-Secret)

## Offen

### Aktuell (Enes)

- [x] Pull Request #4 und #5 gemergt
- [ ] Bruno-Collection (`bruno-rezept.zip`) ins Repository: `extras/bruno/javascript`, danach in Bruno öffnen und prüfen
- [ ] Mail an Herrn Zimmermann mit Repo, Beispiel und zwei Fragen (Hono-Version, Zertifikat und Schlüssel für HTTPS). Entwurf liegt vor

### Als Nächstes (Sai)

- [ ] Vitest-Integrationstests (siehe oben)

### Danach

- [ ] GraphQL mit Yoga
- [ ] OIDC und OAuth 2 mit Keycloak (Rollen, Token, geschützte Routen)
- [ ] E-Mail an Mailpit bei `POST` ("Neues Rezept", wie bei Aufgabe 1 "Neuer Patient"). Ob der Dozent das verlangt, ist offen
- [ ] TLS für den Appserver: `.gitignore` nennt `src/config/tls/key.pem`, Zertifikat und Schlüssel fehlen noch. Bis dahin läuft der Server mit HTTP
- [ ] Regeln in `oxlint.config.mts` ergänzen: `no-var`, `prefer-const`, `@stylistic/quotes` (single), `prefer-destructuring`. Mit `pnpm exec oxlint --rules` prüfen, ob es eine Regel gegen Enums gibt
- [ ] Bruno für GraphQL
- [ ] Docker-Image (Dockerfile) und Docker Compose
- [ ] GitHub Actions (Oxlint, Oxfmt)
- [ ] Lasttests mit Grafana k6
- [ ] OWASP Dependency Check, `pnpm audit`, SonarQube, Pino-Logging
- [ ] PlantUML-Diagramme und Dokumentation (AsciiDoctor)
- [ ] `.env.example` ohne Secrets ins Repository
- [ ] Node auf mindestens 26.13 aktualisieren, Docker-Images für Node 26.13 und Bun 1.4.4 klären
- [ ] Zertifikat läuft am 07.02.2027 ab, vor der Abgabe prüfen
- [ ] Projektplan (Sai und Enes) und Zeiterfassung (Enes) in Excel
- [ ] Code-Review und Abgabe
