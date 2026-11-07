# Notizen zur Aufgabe 3: Appserver mit Hono, TypeScript und Drizzle

Gruppe 2, Enes Cubukcu und Sai Kujala. GitHub: `https://github.com/enescucu1/hono` (öffentlich).
Zeiterfassung (nur Enes) und Projektplan (Sai und Enes) kommen in eine Excel-Datei wie bei Aufgabe 1.

Letzter Stand: 7.11.2026

## Entscheidungen

- Beispiel-Domäne: **Rezept** mit Titel (1:1) und Zutat (1:n) statt Buch, Titel und Abbildung
- OR-Mapping mit **Drizzle** statt Prisma (die Folie ist veraltet, Drizzle hat mehr Downloads)
- Package Manager: **pnpm** (nicht npm, performanter), Runtime Node und Bun
- Die PlantUML-Diagramme aus Aufgabe 2 sind in dieser Aufgabe enthalten
- Arbeitsweise im Team: Feature-Branches mit Pull Requests, der andere prüft (dient als Code-Review)

## Regeln des Dozenten

| Regel | Umsetzung |
|---|---|
| ECMAScript ab 2015 nutzen | Destructuring, Shorthand Properties, `async`/`await` |
| `const` zuerst, `let` nur wenn nötig, kein `var` | `var` ist function scoped |
| Immer `===` und `!==` | keine Typumwandlung, `eqeqeq` in `oxlint.config.mts` |
| Kein Default-Export, Import mit `{ }` | Ausnahme nur, wenn ein Tool es verlangt (z.B. `drizzle.config.ts`, `oxlint.config.mts`) |
| Einfache Anführungszeichen, Semikolon | `singleQuote: true` in Oxfmt, `@stylistic/semi` in Oxlint |
| Zahlen immer als `number` | bei Drizzle `numeric({ mode: 'number' })`, sonst kommt ein String |
| Keine Enums, keine Constructor Properties | Type Stripping, stattdessen Union Types mit String-Literalen. `erasableSyntaxOnly` in tsc |
| Regeln werden in `oxlint.config.mts` definiert | |

## Hintergrund zu den Regeln (Frage, Antwort)

- **Warum kein Default-Export?** Beim Import sieht man nicht, was importiert wird, weil man den Namen frei ändern kann.
- **Warum Typdefinitionen (z.B. `@types/node`), wenn Node in JavaScript geschrieben ist?** Sie beschreiben die Typen für Editor und `tsc` und helfen, Fehler zu vermeiden. Zur Laufzeit sind Typen **nicht** mehr vorhanden, Node schneidet sie beim Type Stripping weg.
- **Warum keine Enums und Constructor Properties?** Beide erzeugen echten JavaScript-Code und lassen sich beim Type Stripping nicht einfach wegschneiden.
- **Was ist `const`?** Die Variable kann nicht neu zugewiesen werden. Der Inhalt eines Objekts oder Arrays kann sich trotzdem ändern.
- **Drei Teile der `package.json`:** `dependencies`, `devDependencies` und `scripts` (Abkürzungen für Befehle, wie bei `pyproject.toml`).

## Erledigt

### Repository (7.11.)

- [x] `C:\workspace\javascript\drizzle` als Git-Repository, Branch `main` (zuerst versehentlich `main+`, per `git symbolic-ref HEAD refs/heads/main` korrigiert)
- [x] Prüfung mit `git check-ignore -v`: `.env` und `server.key` werden ignoriert
- [x] Commit 1: Beispiel des Dozenten (Buch), 40 Dateien
- [x] Commit 2: `pnpm-lock.yaml`
- [x] Repository auf GitHub angelegt und gepusht (ohne README, `.gitignore` und Lizenz, weil sie im Projekt liegen)

### Installation (7.11.)

- [x] pnpm von 12.8.1 auf 12.18.0 aktualisiert (`pnpm self-update`, **außerhalb** des Projektordners), weil `devEngines` mit `pmOnFail: error` sonst abbricht
- [x] `pnpm i`: 125 Pakete, esbuild-Postinstall lief. Der Hinweis "Agent skills awaiting approval: drizzle-kit" wurde ignoriert, kein `pnpm approve`
- [x] Bun auf 1.4.4 aktualisiert (`bun upgrade`)
- [ ] Node ist noch 26.10.0 statt `^26.13.0` (nur Warnung, `C:\Zimmermann\node`), siehe Offen

### PostgreSQL mit Datenbank `buch` (7.11.)

- [x] Die Volumes `pg_data`, `pg_init` und `pg_tablespace` von Aufgabe 1 werden weiterverwendet, **kein** zweiter Postgres-Container (gleicher Containername und Port 5432)
- [x] Nur `init/buch` ins Volume `pg_init` kopiert, `init/patient` und `init/tls` blieben unberührt. Verzeichnis `/tablespace/buch` angelegt
- [x] Postgres aus dem FastAPI-Ordner gestartet, weil die `compose.yml` aus dem Drizzle-Projekt `postgres:19rc1-trixie` verlangt, lokal aber nur `postgres:19beta4-trixie` vorhanden ist
- [x] Mit `psql` angelegt: Datenbank, User und Tablespace, Schema, Tabellen, Testdaten (je `COPY 9`)
- [x] `node --env-file=.env src/beispiele.mts` läuft (Lesen, Pagination, Joins, Admin-Zugriff)
- [x] `node --env-file=.env src/beispiele-write.mts` läuft (INSERT, UPDATE, DELETE). Nicht nochmal ausführen, die ISBN ist eindeutig

### Rezept-Datenbank (7.11.)

- [x] Dateien erzeugt und gegen einen lokalen PostgreSQL 16 getestet: `init/rezept/sql` (`create-db`, `create-schema`, `create-table`, `copy-csv`), `init/rezept/csv` (`rezept`, `titel`, `zutat`), `src/config/postgresql` (`create-table`, `copy-csv`, `drop-table`), neues `ER-Diagramm.plantuml`
- [x] Branch `feature/rezept-db`
- [x] `init/rezept` nur ins Volume `pg_init` kopiert und `/tablespace/rezept` angelegt. Im Volume liegen jetzt `buch`, `patient`, `rezept` und `tls` nebeneinander
- [x] Mit `psql` angelegt: User, Datenbank und Tablespace `rezeptspace`, Schema, Enum `schwierigkeitsgrad`, Tabellen `rezept`, `titel`, `zutat`, Testdaten (`COPY 9`, `COPY 9`, `COPY 19`)
- [ ] Noch nicht committet

## Beobachtungen und Stolpersteine

- `numeric` kommt bei Drizzle als **String** zurück (`"11.10"`), für `number` ist `mode: 'number'` nötig
- Die Testdaten der Rezept-DB sind nach `beispiele-write.mts` verändert (Rezept 30 geändert, Rezept 70 gelöscht, Rezept 1000 neu)
- Die Warnung zu `NODE_TLS_REJECT_UNAUTHORIZED=0` kommt aus der `.env` und ist nur für die lokale Entwicklung mit dem selbst signierten Zertifikat gedacht
- `src/config/postgresql/server.crt` und `extras/compose/postgres/init/tls/server.crt` sind identisch und gültig bis **07.02.2027**
- In der Zip passen die Postgres-Image-Tags nicht zusammen (`compose.yml`: `postgres:19rc1-trixie`, ReadMe: `dhi.io/postgres:19.0-debian13`), im Forum nachfragen
- `ER-Diagramm.plantuml` des Dozenten ist veraltet (`titel_id` im Buch, die SQL-Datei hat `buch_id` in `titel`)
- Das Script `pnpm run drizzle-kit-pull` gibt es nicht, der Befehl lautet `pnpm exec drizzle-kit pull`
- Oxlint meldet `sort-imports`: erst Imports mit mehreren Namen, dann mit einem Namen, innerhalb jeder Gruppe nach dem ersten Namen sortiert (Großbuchstaben vor Kleinbuchstaben)
- Oxlint meldet `TS2591` (`node:process` nicht gefunden) in `drizzle.config.ts`, weil die Datei nicht im `include` der `tsconfig.json` steht und `pnpm run tsc` sie deshalb nie prüft. Lösung: `"drizzle.config.ts"` in `include` aufnehmen
- `drizzle-kit pull` erzeugt unbrauchbare Namen (`rezeptInRezept`, `titelInRezepts`). In `relations.mts` heißt der Parameter `rel` statt `r`, weil die Oxlint-Regel `id-length` einstellige Namen verbietet (Ausnahmen nur `c`, `i`, `T`, `_`)
- Die `.env` ist nicht im Repository. Jeder legt seine eigene an, mit eigenem Keycloak-Secret
- Docker Desktop muss laufen, sonst meldet `docker` einen Fehler zur Verbindung mit der Docker-API

## Starten und Beenden

1. Docker Desktop starten
2. Postgres: `cd C:\workspace\python\fastapi\extras\compose\postgres`, dann `docker compose up -d`, warten bis `healthy`
3. Im Projekt `C:\workspace\javascript\drizzle` arbeiten
4. Beenden: `docker compose down` im Postgres-Ordner. Die Daten bleiben in den Volumes erhalten

## Geplantes Modell: Rezept

| Tabelle | Spalten | Entspricht beim Dozenten |
|---|---|---|
| `rezept` | `id`, `version`, `rezeptnummer` (eindeutig), `bewertung` (0 bis 5), `schwierigkeit` (EINFACH, MITTEL, SCHWER), `kosten`, `zubereitungszeit` (Minuten), `vegetarisch`, `datum`, `quelle`, `schlagwoerter` (jsonb), `erzeugt`, `aktualisiert` | `buch` |
| `titel` | `id`, `titel`, `untertitel`, `rezept_id` (1:1, eindeutig) | `titel` |
| `zutat` | `id`, `bezeichnung`, `menge`, `einheit`, `rezept_id` (1:n, mit Index) | `abbildung` |

`rabatt` und `buch_file` entfallen. `schwierigkeit` ist in der DB ein Postgres-Enum, im Code ein Union Type.

## Offen

### Als Nächstes (Drizzle-Schema für Rezept)

- [ ] Stand sichern: committen und `feature/rezept-db` pushen
- [x] `.env` (lokal, nicht im Repo) und `drizzle.config.ts` auf `rezept` umgestellt (`DATABASE_URL`, `DATABASE_URL_ADMIN`, `schemaFilter`)
- [x] `pnpm exec drizzle-kit pull`: 3 Tabellen, 22 Spalten, 1 Enum, 6 Indizes, 2 Foreign Keys, 3 Check-Constraints. Der Ordner `drizzle` ist in der `.gitignore`
- [x] `schema.mts` und `relations.mts` nach `src/db` übernommen: `rezeptSchema`, `rezeptTable`, `titelTable`, `zutatTable`, `numeric` mit `mode: 'number'`, `jsonb().$type<string[]>()`, `.defaultNow()`, Named Imports mit `.mts`
- [x] `beispiele.mts` und `beispiele-write.mts` auf Rezept umgestellt, relationale Abfrage mit `db.query` ergänzt. Verzeichnis `init/buch` aus dem Repo entfernen (`git rm -r`)
- [x] `pnpm exec oxfmt`, `pnpm run lint` (0 Fehler) und `pnpm run tsc` (ohne Fehler)
- [x] Beide Beispiele laufen gegen die Rezept-DB: `kosten` und `menge` kommen als `number`, die relationale Abfrage (`db.query`) liefert Rezept 20 mit Titel (`untertitel: null`) und drei Zutaten in **einer** SQL-Abfrage. `beispiele-write.mts` hat Rezept 1000 angelegt, Rezept 30 auf Version 1 geändert und Rezept 70 gelöscht (nicht nochmal ausführen)
- [ ] Pull Request, Sai prüft

### Danach

- [ ] Regeln in `oxlint.config.mts` ergänzen: `no-var`, `prefer-const`, `@stylistic/quotes` (single), `prefer-destructuring`. Mit `pnpm exec oxlint --rules` prüfen, ob es eine Regel gegen Enums gibt
- [ ] Hono: REST-Schnittstelle, Validierung mit Zod, GraphQL Yoga
- [ ] OIDC und OAuth 2 mit Keycloak
- [ ] Vitest mit Fetch API für Integrationstests
- [ ] Oxlint und Oxfmt im Projekt laufen lassen und Meldungen beheben
- [ ] Bruno (REST und GraphQL)
- [ ] Docker-Image (Dockerfile) und Docker Compose
- [ ] GitHub Actions (Oxlint, Oxfmt)
- [ ] Lasttests mit Grafana k6
- [ ] OWASP Dependency Check, `pnpm audit`, SonarQube, Pino-Logging
- [ ] Projektplan (Sai und Enes) und Zeiterfassung (Enes) in Excel
- [ ] Node auf mindestens 26.13 aktualisieren, Docker-Images für Node 26.13 und Bun 1.4.4 im Forum klären
- [ ] `.env.example` ohne Secrets ins Repository, damit Sai eine Vorlage hat
- [ ] Zertifikat läuft am 07.02.2027 ab, vor der Abgabe prüfen
- [ ] Code-Review und Abgabe
- [ ] Forum: Image-Tags (Postgres) und Hinweis zum veralteten ER-Diagramm
