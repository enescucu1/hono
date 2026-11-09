# Notizen zur Aufgabe 3: Appserver mit Hono, TypeScript und Drizzle

Gruppe 2, Enes Cubukcu und Sai Kujala. GitHub: `https://github.com/enescucu1/hono` (öffentlich).
Zeiterfassung (nur Enes) und Projektplan (Sai und Enes) stehen in `SWE_Enes_Cubukcu_Zeiterfassung_Planung_Aufgabe3.xlsx` (wie bei Aufgabe 1).

Letzter Stand: 9.11.2026, abends (Enes)

## Übergabe an Sai: Vitest-Integrationstests

Sai macht als Nächstes die **Integrationstests mit Vitest** für die REST-Schnittstelle (Folie: "Vitest mit Fetch API für Integrationstests"). Der REST-Teil ist fertig, die Routen stehen im Abschnitt "REST-Schnittstelle".

### Vorher prüfen

- [x] Pull Request #4 (POST) und #5 (PUT, DELETE, ETag) sind in `main` gemergt (7.11., die Konflikte in drei Dateien waren gelöst)
- [ ] Nach `git checkout main` und `git pull` enthält `src/rezept/rest/rezept-write.router.mts` die Routen `PUT` und `DELETE` (zum Beispiel mit `Select-String "put|delete" src\rezept\rest\rezept-write.router.mts`)
- [ ] Projekt eingerichtet (Abschnitt "Projekt einrichten") und `pnpm run dev` läuft, `https://localhost:3000/rest/20` liefert das Rezept "Pfannkuchen" (HTTPS, die Zertifikatswarnung im Browser bestätigen)
- [ ] Nach `git pull` einmal `pnpm i` ausführen: seit dem 8.11. gibt es die neuen Pakete `graphql`, `graphql-yoga`, `nodemailer`, `c12`, `pino` und `pino-pretty`
- [ ] Den privaten Schlüssel `key.pem` aus der `hono.zip` des Dozenten nach `src/config/tls/key.pem` kopieren. Er steht in der `.gitignore` und ist nicht im Repository. Ohne ihn startet der Server nicht
- [ ] Optional: Mailpit läuft (Abschnitt "Starten und Beenden"). Ohne Mailpit steht beim Anlegen eines Rezepts ein Fehler im Log, die Antwort ist trotzdem 201

### Vorgehen

1. Branch `feature/vitest-integration` von `main`
2. Vitest installieren: erst mit `pnpm view vitest version` die aktuelle Version ansehen (am 7.11. war `latest` 5.1.0), dann `pnpm add -D vitest@<Version>`. Die `hono.zip` des Dozenten nutzt `vitest` 5.1.0 mit `@vitest/ui` und `@vitest/coverage-istanbul` 5.1.0, `axios` 1.21.0 und `vite` 8.3.6, das läuft dort mit Node 26 und TypeScript 7.1 beta
3. Konfiguration `vitest.config.mts` im Wurzelverzeichnis, Vorlage ist die Datei aus der `hono.zip` (sie setzt auch `NODE_TLS_REJECT_UNAUTHORIZED=0` für das selbst-signierte Zertifikat). Vitest verlangt dort einen Default-Export, deshalb die Zeile `// oxlint-disable-next-line import/no-default-export` davor. Ob die Datei in die `include`-Liste der `tsconfig.json` gehört, zeigt `pnpm run tsc`. In der `hono.zip` steht sie dort nicht und `drizzle.config.ts` steht jetzt in `ignorePatterns` von Oxlint
4. In der `package.json` das Script `test` ersetzen (steht dort noch `echo Keine Tests`), zum Beispiel durch `vitest run`
5. Testdateien wie in der `hono.zip` in `test/integration/rest/` (und `test/integration/graphql/`), passend zum Override in `oxlint.config.mts` (`test/integration/*/*.test.mts`), zum Beispiel `GET-id.test.mts`, `GET-queryparam.test.mts`, `POST.test.mts`, `PUT.test.mts` und `DELETE.test.mts`. Vorlage sind die gleichnamigen Tests des Dozenten für Buch
6. Wie üblich: `pnpm exec oxfmt`, `pnpm run lint`, `pnpm run tsc`, dann Commit, Pull Request, Enes mergt

### Regeln für die Tests (aus `oxlint.config.mts`)

- `import { describe, expect, test } from 'vitest'` (nicht die Globals nutzen, die Regel `no-importing-vitest-globals` ist aus, aber das Projekt importiert explizit)
- `test` statt `it` in `describe`-Blöcken (`vitest/consistent-test-it`)
- Als Hooks nur `beforeAll` und `beforeEach` (`vitest/no-hooks`)
- `expect.assertions(n)` bei Tests mit `expect` in einer Schleife (`vitest/prefer-expect-assertions`)
- Statuscodes wie 200, 201, 204, 304, 404, 412, 422, 428 sind für `no-magic-numbers` erlaubt, andere Zahlen als `const` benennen

### Wie die Tests ablaufen sollen

- Die Tests rufen den **laufenden** Server auf `https://localhost:3000` auf. Voraussetzung: PostgreSQL und `pnpm run dev` laufen (wie bei Aufgabe 1: Backend und Appserver laufen, dann `pnpm test`). Das Zertifikat ist selbst-signiert, deshalb `NODE_TLS_REJECT_UNAUTHORIZED=0` (steht in der `.env` und in der `vitest.config.mts` des Dozenten)
- Der Server erlaubt HTTP/1.1 und HTTP/2. Der Dozent testet mit `axios` und `httpVersion: 2`, die Fetch API (`fetch`, in Node eingebaut) geht auch, spricht aber nur HTTP 1.1
- Antworten sind komprimiert (gzip), der ETag ist dann schwach (`W/"0"`). Der Server akzeptiert das bei `If-Match` und `If-None-Match`, die Tests dürfen den ETag aus dem Header unverändert zurückschicken
- Das Neuladen der DB über `/dev/db_populate` und das Token von Keycloak (wie in `setup.global.mts` der `hono.zip`) gibt es bei uns **noch nicht**. Bis dahin nur die Seed-Daten lesen und mit eigenen Rezepten arbeiten (siehe unten)
- Fehlerantworten haben die Form `{ "message": "...", "details": ... }`, bei 422 steht in `details` das Ergebnis von `z.flattenError`
- `204` und `304` haben keinen Body. Header lesen mit `response.headers.get('etag')` und `response.headers.get('location')`
- **Testdaten:** Tests, die Daten ändern (POST, PUT, DELETE), legen sich ihr Rezept selbst per `POST` an (zufällige Rezeptnummer, Format `RZ-` plus 3 bis 6 Ziffern, zum Beispiel `RZ-` plus sechs zufällige Ziffern) und räumen mit `DELETE` auf. Lesetests nutzen die Seed-Rezepte (siehe "Testdaten")
- Beim `POST` (und bei der GraphQL-Mutation `create`) geht eine Mail an Mailpit. Die Tests prüfen die Mail nicht. Läuft Mailpit nicht, ist das für die Tests egal
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

GraphQL (optional, wenn Zeit bleibt, Vorlage ist der Bruno-Ordner `GraphQL`):

- [ ] `POST /graphql` mit `{ rezept(id: 20) { id titel { titel } zutaten { bezeichnung } } }`: 200, `data.rezept.id` ist 20, drei Zutaten
- [ ] `rezept(id: 4711)`: 200 und `data.rezept` ist `null`
- [ ] `rezepte(suchkriterien: { vegetarisch: true, schwierigkeit: EINFACH })`: alle Treffer vegetarisch und `EINFACH`
- [ ] `rezepte(suchkriterien: { groesse: 100 })`: 200, aber `errors[0].extensions.code` ist `BAD_USER_INPUT`
- [ ] Mutation `create` mit gültigen Daten: `data.create.id` ist eine Zahl (danach per `DELETE /rest/<id>` aufräumen). Mit vorhandener Rezeptnummer oder ungültigen Daten: `BAD_USER_INPUT`

## Projekt einrichten (für Sai)

Pfad wie bei Enes `C:\workspace\javascript\...` (nicht in einem Pfad mit Leerzeichen).

1. **Voraussetzungen:** Docker Desktop, Git, Node 26 (aus der `Zimmermann.zip` in ILIAS, `C:\Zimmermann\node`), pnpm mindestens 12.18 (`pnpm self-update` **außerhalb** des Projektordners ausführen, sonst bricht `pmOnFail: error` ab), Bun optional. Node 26.10 und Bun 1.4.2 reichen, es gibt nur Warnungen
2. **Klonen:** `git clone https://github.com/enescucu1/hono.git`, dann `cd hono`
3. **Pakete:** `pnpm i`. Den Hinweis "Agent skills awaiting approval: drizzle-kit" ignorieren, kein `pnpm approve`
4. **`.env` anlegen** (nicht im Repository, jeder hat seine eigene). Inhalt nach dem Vorbild von `ReadMe.drizzle.md` und `ReadMe.vscode.md`:
   - `NODE_ENV=development`
   - `NODE_TLS_REJECT_UNAUTHORIZED=0`
   - `DATABASE_URL` und `DATABASE_URL_ADMIN` (nur noch für `drizzle-kit`, der Appserver liest die DB-Daten aus `src/config/config.toml`) für die Datenbank `rezept` mit Schema `rezept`, User `rezept` bzw. `postgres`, `sslnegotiation=direct` und `sslcert=src/config/postgresql/server.crt`. Das Passwort des Users `rezept` steht in `extras/compose/postgres/init/rezept/sql/create-db.sql`
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
6. **Schlüssel für HTTPS:** `key.pem` aus der `hono.zip` des Dozenten (`src/config/tls/key.pem`) in das Verzeichnis `src/config/tls` des Projekts kopieren. Das Zertifikat `certificate.crt` liegt schon im Repository
7. **Prüfen:** `pnpm run lint` und `pnpm run tsc` ohne Fehler, dann `pnpm run dev` und im Browser `https://localhost:3000/rest/20` (die Zertifikatswarnung bestätigen)

## Starten und Beenden

Reihenfolge zum Starten:

1. Docker Desktop starten
2. PostgreSQL: Enes startet ihn aus dem FastAPI-Ordner (`cd C:\workspace\python\fastapi\extras\compose\postgres`, dann `docker compose up -d`), siehe "Projekt einrichten"
3. Mailpit (optional, nur für die Mail beim Anlegen): der Compose-Ordner `mailpit` aus Aufgabe 1 (`docker compose up -d`). Im Repository `hono` gibt es dafür noch keinen Compose-Ordner (steht unter "Offen")
4. Appserver im Projektordner: `pnpm run dev`, warten auf `Der Appserver laeuft auf https://localhost:3000`. Das Log steht in der Konsole und in `log/server.log` (nicht im Repository)

Beenden: Appserver mit Strg+C, dann `docker compose down` in den Compose-Ordnern. Die Daten bleiben in den Volumes erhalten.

Adressen:

- REST: `https://localhost:3000/rest` (HTTPS mit selbst-signiertem Zertifikat, in Bruno ist die SSL-Prüfung aus)
- GraphQL: `https://localhost:3000/graphql` (im Browser öffnet sich GraphiQL)
- Mailpit: Weboberfläche `http://localhost:8025`, SMTP auf Port 1025

## Beispiele des Dozenten (hono.zip und drizzle.zip vom 9.11.)

Der Dozent hat im ILIAS-Ordner "Beispiele" eine **komplette Beispielanwendung** (`hono.zip`, Buch) und eine aktualisierte `drizzle.zip` hochgeladen. Wir bauen weiter in unserem Repository und holen uns die fehlenden Teile Schritt für Schritt hinein, in der Reihenfolge der `VORGEHENSWEISE.md` aus der `hono.zip`. Beantwortet sind damit unsere zwei offenen Fragen: Der Dozent nutzt auch Hono 5.0.0-rc.0, und Zertifikat und Schlüssel für HTTPS liegen in `src/config/tls`.

Änderungen in `drizzle.zip` (übernommen am 9.11.): Oxlint 1.92.0, Oxfmt 0.77.0, `tsrs` 0.23.0, `oxlint-tsgolint` entfernt, `drizzle.config.ts` in `ignorePatterns` von Oxlint (mit `@ts-expect-error` in der Datei statt Eintrag in der `tsconfig.json`), `minimumReleaseAgeExclude` für Hono entfernt.

Was die `hono.zip` hat und wie weit wir sind:

| Teil | Dozent | Wir |
|---|---|---|
| REST, GraphQL, Mail, ETag | ja | ja (Update und Delete bei GraphQL fehlen) |
| HTTPS mit HTTP/2 und TLS 1.3 | ja | ja (9.11.) |
| Konfiguration in `config.toml` (`c12` und Zod) | ja | ja (9.11.) |
| Pino-Logging, Antwortzeit, Request-Log | ja | ja (9.11.) |
| Security-Header, CORS, Komprimierung | ja | ja (9.11.) |
| Fehlerformat Problem Details (RFC 9457) mit zentralem Error-Handler | ja | offen, wir haben `{ message, details }` |
| `/dev/db_populate` (DB neu laden), Dev-Router | ja | offen |
| Keycloak mit `jose`, Token-Route, Rollen | ja | offen |
| Health (liveness, readiness), Prometheus | ja | offen |
| Suche mit der Methode `QUERY`, File Upload und Download | ja | offen (Upload entfällt im Modell Rezept) |
| Unit-Tests und Integrationstests mit Vitest | ja | offen (Sai) |
| Dockerfile (mehrere Varianten), `docker-bake.hcl`, Compose für App, Mailpit, Keycloak, SonarQube, Prometheus | ja | offen |
| Lasttests mit k6, AsciiDoc und PlantUML, Typedoc | ja | offen |

## Stand der Arbeit

### Gemergte Pull Requests

| Nr. oder Branch | Inhalt |
|---|---|
| #1 | Rezept-Datenbank (SQL, CSV, ER-Diagramm), Drizzle-Schema und Relations, Beispiele, Lint und Notizen |
| #2 | Hono-Gerüst: `src/config`, `src/rezept/service`, `src/rezept/rest`, `src/server.mts`, `GET /rest/:id` |
| #3 | Suche `GET /rest` mit Query-Parametern und Zod |
| #4 | `POST /rest` mit Zod, Anlegen von Rezept, Titel und Zutaten in einer Transaktion |
| #5 | `PUT`, `DELETE` und ETag (If-Match, If-None-Match), dazu die Übergabe-Notizen |
| #6 | GraphQL mit Yoga (Query `rezept` und `rezepte`, Mutation `create`) und Bruno-Ordner `GraphQL` |
| #7 `feature/ci` | GitHub Actions: Oxfmt, Oxlint und tsc (`.github/workflows/ci.yml`) |
| #8 `feature/mail` | E-Mail an Mailpit nach dem Anlegen eines Rezepts (`nodemailer`) |
| #9 `feature/aufraeumen` | Neue Oxlint- und Oxfmt-Versionen, `drizzle.config.ts` wie beim Dozenten |
| #10 `feature/config-https` | Konfiguration in `config.toml` und HTTPS mit TLS 1.3 (HTTP/2) |
| `feature/logging-middleware` | Pino-Logging, Security-Header, CORS, Komprimierung und schwache ETags |

### REST-Schnittstelle

Server: `https://localhost:3000` (HTTPS mit selbst-signiertem Zertifikat).

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

### GraphQL-Schnittstelle

Adresse `https://localhost:3000/graphql`, `GET` zeigt im Browser GraphiQL, `POST` führt Abfragen aus. Schema-first mit GraphQL Yoga: das Schema steht in `rezept-typedefs.mts`, die Resolver in `rezept-resolvers.mts`.

| Operation | Ergebnis |
|---|---|
| Query `rezept(id: Int!)` | das Rezept mit Titel und Zutaten, oder `null` (kein 404) |
| Query `rezepte(suchkriterien)` | Rezepte mit `titel`, `schwierigkeit`, `vegetarisch`, `seite` (Standard 1), `groesse` (Standard 5, maximal 20), ggf. leere Liste |
| Mutation `create(input: RezeptInput!)` | `{ id }` des neuen Rezepts |

Fehler (ungültige Suchkriterien oder Rezeptdaten, doppelte Rezeptnummer) stehen bei GraphQL in `errors` mit `extensions.code` gleich `BAD_USER_INPUT` und den Zod-Fehlern in `extensions.details`. Der HTTP-Status ist trotzdem 200. Die Validierung nutzt dasselbe Zod-Schema wie `POST /rest`. Beispiel:

```graphql
query {
  rezept(id: 20) {
    id
    titel { titel }
    zutaten { bezeichnung menge einheit }
  }
}
```

### E-Mail an Mailpit

Nach dem Anlegen eines Rezepts (`POST /rest` und Mutation `create`) geht eine Mail "Neues Rezept: ID=..." von `Rezept Server` an `Redaktion` (`src/mail/mail.service.mts`, Absender, Empfänger und Server im Abschnitt `[mail]` von `config.toml`). Die Mail wird erst nach dem COMMIT gesendet. Bei einem Fehler (zum Beispiel Mailpit läuft nicht) wird nur ins Log geschrieben, das Rezept bleibt gespeichert und die Antwort ist 201. Timeout 5 Sekunden.

### Bruno-Collection (extras/bruno/javascript)

Collection `rezept` mit 42 Requests (32 REST und 10 GraphQL) im Stil der Collection `patient` aus Aufgabe 1. Öffnen in Bruno: **Open Collection** und den Ordner `extras\bruno\javascript` wählen. Voraussetzung: PostgreSQL und `pnpm run dev` laufen. Die Adresse steht in der Collection-Variable `baseUrl` (`http://localhost:3000`), eine Environment ist nicht nötig.

- `REST > Suche mit ID`: GET mit ID 1, 20, 30, unbekannter und ungültiger ID, `If-None-Match` (304)
- `REST > Suche mit Suchparameter`: 11 Requests (Alle, Seite 2, Titel, vegetarisch, ungültige Parameter mit 422, kein Treffer mit 404)
- `REST > Neu anlegen`: POST mit zufälliger Rezeptnummer (wiederholbar), doppelte Nummer, ungültige Daten, unbekannte Property, kein JSON
- `REST > Ändern`: PUT mit `If-Match`, falsche oder fehlende Version, kaputter Header, unbekannte ID, ungültige Daten, Rezeptnummer im Body
- `REST > Löschen`: DELETE für Rezept 50, das neu angelegte Rezept und eine unbekannte ID
- `GraphQL`: Rezept 20, unbekannte ID (`null`), alle Rezepte, Suche nach Titel, vegetarisch und `EINFACH`, zu große Seitengröße, Mutation `create` (wiederholbar), doppelte Rezeptnummer, ungültige Daten, danach `DELETE` des neuen Rezepts über REST (Variable `graphqlId`)

Zusammenhang der Requests: `Vorhandene ID 30` merkt den ETag in der Variable `etag`, die PUT-Requests schicken ihn als `If-Match` und aktualisieren ihn nach Erfolg. `Neues Rezept` merkt die ID aus dem Header `Location` in `neueId` (für `Neu angelegtes Rezept löschen`) und die Rezeptnummer in `rezeptnummer` (für den Request mit doppelter Nummer). Jeder Request hat Assertions. Mit der Bruno-CLI 4.3.0 gegen die Seed-Daten geprüft: 32 von 32 Requests und 48 von 48 Assertions bestanden, auch beim zweiten Durchlauf. Mit dem Ordner `GraphQL` sind es 42 von 42 Requests. Die GraphQL-Requests hat Enes zusätzlich von Hand in Bruno durchlaufen (alle grün).

Die Testfälle für Vitest (siehe oben) entsprechen dieser Collection.

### Code-Struktur

```text
src/
  config/config.toml, config.mts       Konfiguration (c12 und Zod), paths.mts, cors-options.mts
  config/db.mts                        Drizzle-Client mit den Werten aus config.toml
  config/tls/                          certificate.crt (im Repo) und key.pem (nur lokal)
  logger/                              Pino-Logger, Request-Log und Antwortzeit
  db/schema.mts, relations.mts         Tabellen und Relationen (titel, zutaten, rezept)
  rezept/rest/                         Hono-Router, Zod-Schemas und etag.mts
  rezept/graphql/                      GraphQL: typedefs, resolvers und Hono-Router mit Yoga
  rezept/service/                      Zugriff auf die DB (Lesen und Schreiben)
  mail/mail.service.mts                Mail an Mailpit mit nodemailer
  app.mts                              Hono-App mit Middleware und Routen
  server.mts                           startet den HTTPS-Server
  beispiele.mts, beispiele-write.mts   Beispiele des Dozenten, auf Rezept umgestellt
.github/workflows/ci.yml               GitHub Actions: fmt:check, lint, tsc
```

### Testdaten

Die CSV-Dateien in `extras/compose/postgres/init/rezept/csv` legen 9 Rezepte (IDs 1, 20, 30, 40, 50, 60, 70, 80, 90), 9 Titel und 19 Zutaten an. Rezept 20 hat keinen Untertitel, Rezept 90 keine Schwierigkeit, kein Datum, keine Quelle und keine Schlagwörter (zum Testen von `null`). Danach geänderte Daten (zum Beispiel durch `beispiele-write.mts` oder Bruno) bleiben in der DB, bis man sie neu lädt.

## Entscheidungen

- Beispiel-Domäne: **Rezept** mit Titel (1:1) und Zutat (1:n) statt Buch, Titel und Abbildung
- OR-Mapping mit **Drizzle** statt Prisma (die Folie ist veraltet, Drizzle hat mehr Downloads)
- Package Manager: **pnpm** (nicht npm, performanter), Runtime Node und Bun
- Die PlantUML-Diagramme aus Aufgabe 2 sind in dieser Aufgabe enthalten
- Arbeitsweise im Team: Feature-Branches mit Pull Requests, Enes mergt selbst
- Hono 5.0.0-rc.0 mit `@hono/node-server` 2.1.6, vom Dozenten in `hono.zip` bestätigt
- Suche liefert 404, wenn nichts gefunden wird (wie `GET /rest/:id`). Ungültige Eingaben liefern 422 mit den Fehlern von Zod
- `PUT` ersetzt Rezept, Titel und alle Zutaten (nicht angegebene optionale Werte werden `NULL`). Die Rezeptnummer ist unveränderlich
- Optimistische Synchronisation über die Spalte `version` mit `ETag` und `If-Match`
- Rezept, Titel und Zutaten werden beim Anlegen und Ändern in einer Transaktion geschrieben
- GraphQL: **Schema-first** mit `createSchema` aus `graphql-yoga` (keine zusätzliche Bibliothek), `rezept(id)` liefert `null` statt 404, Fehler als `BAD_USER_INPUT` mit HTTP-Status 200. Validierung mit denselben Zod-Schemas wie bei REST, `null`-Werte aus der Mutation werden vor der Prüfung entfernt
- Mail: im Service nach dem COMMIT, damit REST und GraphQL sie gemeinsam nutzen. Ein Mailfehler wird nur protokolliert und verhindert das Anlegen nicht
- Konfiguration: `config.toml` mit `c12` und Zod-Schema (Standardwerte im Schema), Geheimnisse später in der `.env`. Die DB-Daten stehen nicht mehr als Konstanten im Code
- HTTPS: `node:http2` mit TLS 1.3, `allowHTTP1` wegen Bruno. Strg+C schließt den Server und die DB-Verbindungen
- Logging mit Pino (Datei und Konsole). Die Antwortzeit wird mit `performance.now()` gemessen, ohne Temporal-Bibliothek
- ETag und `If-Match`: wegen `hono/compress` ist der ETag komprimierter Antworten schwach (`W/"0"`). Beide Schreibweisen werden akzeptiert (`src/rezept/rest/etag.mts`)
- CI: `pnpm/action-setup` und `actions/setup-node` lesen pnpm und Node aus `devEngines` in der `package.json`, `pnpm install --frozen-lockfile`, nur lesender Zugriff (`permissions: contents: read`)

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
- `nodemailer` 10.4.0 war am 8.11. erst einen Tag alt und wird von `minimumReleaseAge` abgelehnt, deshalb `nodemailer@10.3.1`. `nodemailer` 10 bringt eigene Typen mit, `@types/nodemailer` aus der `package.json` wird dadurch nicht gebraucht, stört aber nicht
- GraphiQL ist für alle Umgebungen eingeschaltet (`graphiql: true` in `graphql.router.mts`), das soll später nur für die Entwicklung gelten
- Bei `rezepte` werden die Zutaten pro Rezept einzeln nachgeladen (eine kleine Abfrage je Rezept, höchstens 20). Das reicht hier, kann bei Bedarf in einer Abfrage gebündelt werden
- Die Hinweise "Agent skills awaiting approval: drizzle-kit" bei `pnpm add` können ignoriert werden
- Der Mailpit-Compose aus Aufgabe 1 liegt nicht im Repository `hono` (dort gibt es nur `debug` und `postgres`)
- `hono/compress` macht den ETag komprimierter Antworten schwach (`W/"0"`). Ohne Anpassung lehnt `PUT` den Header `If-Match: W/"0"` mit 412 ab, in Bruno schlugen dadurch 4 Requests fehl
- Befehle wie `git` und `pnpm` immer im Projektordner `C:\workspace\javascript\drizzle` ausführen. Im Ordner `C:\` legt `pnpm add` sonst einen Ordner `node_modules` an (löschen)
- GitHub Actions meldete am 9.11. bei drei Läufen `Internal server error` (Fehler bei GitHub, nicht im Code). Auf der Seite des Laufs `Re-run all jobs`
- `key.pem` steht in der `.gitignore`: `git status` zeigt nur `certificate.crt`. Wer das Repository klont, muss `key.pem` selbst nach `src/config/tls` kopieren
- Die Oxlint-Regel `import/max-dependencies` (höchstens 10 Imports) ist in `src/app.mts` mit `// oxlint-disable-line` an einer Zeile abgeschaltet, wie beim Dozenten in der Datei `app.mts`

## Offen

### Aktuell (Enes)

- [x] Pull Request #4 und #5 gemergt
- [x] Bruno-Collection im Repository (`extras/bruno/javascript`), GraphQL-Ordner dazu
- [x] GraphQL mit Yoga, GitHub Actions und E-Mail an Mailpit (8.11., gemergt)
- [x] Mail an Herrn Zimmermann ist nicht mehr nötig: `hono.zip` beantwortet beide Fragen (Hono-Version und Zertifikat)
- [x] Aufräumen, Konfiguration mit `config.toml`, HTTPS, Pino-Logging und Middleware (9.11.)
- [ ] Als Nächstes: Fehlerformat Problem Details mit zentralem Error-Handler (dabei die Bruno-Assertion auf `details.fieldErrors` anpassen) und `/dev/db_populate`

### Als Nächstes (Sai)

- [ ] Vitest-Integrationstests (siehe oben)

### Danach

- [ ] OIDC und OAuth 2 mit Keycloak (`jose`, Token-Route, Rollen für `POST`, `PUT`, `DELETE` und die GraphQL-Mutationen), Keycloak-Compose aus Aufgabe 1 oder `extras/compose/keycloak` der `hono.zip`
- [ ] GraphQL: Update und Delete wie in der `hono.zip`
- [ ] Health (liveness, readiness) und Prometheus-Metriken
- [ ] Regeln in `oxlint.config.mts` ergänzen: `no-var`, `prefer-const`, `@stylistic/quotes` (single), `prefer-destructuring`. Mit `pnpm exec oxlint --rules` prüfen, ob es eine Regel gegen Enums gibt
- [ ] Docker-Image (Dockerfile) und Docker Compose, dabei auch einen Compose-Ordner für Mailpit ins Repository
- [ ] GitHub Actions: ergänzen um Vitest, sobald die Tests von Sai da sind (brauchen PostgreSQL und den Appserver)
- [ ] GraphiQL nur in der Entwicklung einschalten
- [ ] Lasttests mit Grafana k6
- [ ] OWASP Dependency Check, `pnpm audit`, SonarQube
- [ ] PlantUML-Diagramme und Dokumentation (AsciiDoctor)
- [ ] `.env.example` ohne Secrets ins Repository
- [ ] Node auf mindestens 26.13 aktualisieren, Docker-Images für Node 26.13 und Bun 1.4.4 klären
- [ ] Zertifikat läuft am 07.02.2027 ab, vor der Abgabe prüfen
- [ ] Projektplan (Sai und Enes) und Zeiterfassung (Enes) in Excel pflegen (Zeiterfassung macht Enes am Ende jeder Arbeitssession)
- [ ] Code-Review und Abgabe
