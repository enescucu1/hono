// oxlint-disable no-magic-numbers
// Copyright (C) 2026 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

// Aufruf:  pnpm i
//          node --env-file=.env src\beispiele-write.mts

import { eq, sql } from 'drizzle-orm';
import { rezeptTable, titelTable, zutatTable } from './db/schema.mts';
import { type PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFile } from 'node:fs/promises';
import { styleText } from 'node:util';

let message: string;

// https://orm.drizzle.team/docs/insert
type RezeptInsert = typeof rezeptTable.$inferInsert;
const neuesRezept: RezeptInsert = {
    // Spaltentyp "text"
    rezeptnummer: 'RZ-100',
    // Spaltentyp "integer"
    bewertung: 1,
    // Spaltentyp "enum('EINFACH', ...)"
    schwierigkeit: 'EINFACH',
    // number -> Spaltentyp "numeric" mit mode "number"
    kosten: 99.99,
    zubereitungszeit: 45,
    // Spaltentyp "boolean"
    vegetarisch: true,
    // Datum im Format ISO8601 fuer Spaltentyp "date"
    datum: '2026-02-28T00:00:00Z',
    quelle: 'https://beispiele.drizzle',
    // Spaltentyp "jsonb"
    schlagwoerter: ['BEISPIEL', 'TYPESCRIPT'],
};

// ohne Fremdschluessel-Spalte
type TitelInsert = Omit<typeof titelTable.$inferInsert, 'rezeptId'>;
const neuerTitel: TitelInsert = {
    titel: 'Beispiel',
    untertitel: 'beispiel',
};

// ohne Fremdschluessel-Spalte
type ZutatInsert = Omit<typeof zutatTable.$inferInsert, 'rezeptId'>;
const neueZutaten: ZutatInsert[] = [
    {
        bezeichnung: 'Reis',
        menge: 200,
        einheit: 'g',
    },
    {
        bezeichnung: 'Paprika',
        menge: 1.5,
        einheit: 'Stueck',
    },
];

type RezeptUpdate = PgUpdateSetSource<typeof rezeptTable>;
const geaendertesRezept: RezeptUpdate = {
    version: 1,
    bewertung: 5,
    schwierigkeit: 'MITTEL',
    kosten: 33.33,
    zubereitungszeit: 35,
    vegetarisch: true,
    datum: '2026-03-03T00:00:00Z',
    quelle: 'https://geaendert.put.rest',
    schlagwoerter: ['SUPPE'],
};

// Drizzle-Client mit DB-User "rezept"
const db = drizzle({
    connection: {
        user: 'rezept',
        database: 'rezept',
        password: 'p',
        host: 'localhost',
        ssl: {
            cert: await readFile(new URL('config/postgresql/server.crt', import.meta.url)),
            minVersion: 'TLSv1.3',
            maxVersion: 'TLSv1.3',
        },
        sslnegotiation: 'direct',
        // Connection Pool
        max: 10,
        idleTimeoutMillis: 30_000, // Timeout, wie lange eine Verbindung inaktive ist, bevor sie geschlossen wird
        connectionTimeoutMillis: 5_000, // Timeout fuer Aufbau der DB-Verbindung
    },
    logger: true,
});

// Operationen mit "rezeptTable" aus "db/schema.mts"
try {
    // COMMIT, wenn der Callback bzw. Arrow-Function erfolgreich ist
    // ROLLBACK, wenn ein Error geworfen wird
    await db.transaction(async (tx) => {
        // https://orm.drizzle.team/docs/insert
        const [rezeptInsert] = await tx.insert(rezeptTable).values(neuesRezept).returning();
        if (rezeptInsert === undefined) {
            throw new Error('Das Rezept wurde nicht eingefuegt.');
        }
        const rezeptId = rezeptInsert.id;

        // Spread Operator
        const [titelInsert] = await tx
            .insert(titelTable)
            .values({ ...neuerTitel, rezeptId })
            .returning();
        if (titelInsert === undefined) {
            throw new Error('Der Titel wurde nicht eingefuegt.');
        }

        const zutatenInsert = await Promise.all(
            neueZutaten.map(async (zutat) => {
                const [zutatInsert] = await tx
                    .insert(zutatTable)
                    .values({ ...zutat, rezeptId })
                    .returning({ id: zutatTable.id });
                if (zutatInsert === undefined) {
                    throw new Error('Die Zutat wurde nicht eingefuegt.');
                }
                return zutatInsert;
            }),
        );

        message = styleText(['black', 'bgWhite'], 'Generierte IDs');
        console.log(`${message}: %j`, {
            rezept: [rezeptInsert.id, rezeptInsert.erzeugt],
            titel: titelInsert.id,
            zutaten: zutatenInsert.map((zutat) => zutat.id),
        });

        // https://orm.drizzle.team/docs/update
        const [rezeptUpdate] = await tx
            .update(rezeptTable)
            .set({
                // Spread-Operator
                ...geaendertesRezept,
                // Funktion "now" von SQL durch den Template-String aufrufen
                aktualisiert: sql`now()`,
            })
            .where(eq(rezeptTable.id, 30))
            .returning();

        message = styleText(['black', 'bgWhite'], 'Neue Version');
        console.log(`${message}: %s, %s`, rezeptUpdate?.version, rezeptUpdate?.aktualisiert);

        // https://orm.drizzle.team/docs/delete
        // "CREATE TABLE" mit "ON DELETE CASCADE"
        const rezeptDelete = await tx.delete(rezeptTable).where(eq(rezeptTable.id, 70)).returning();
        message = styleText(['black', 'bgWhite'], 'Anzahl DELETE');
        console.log(`${message}: `, rezeptDelete.length);
    });
} finally {
    await db.$client.end();
}
