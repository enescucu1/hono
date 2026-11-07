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
//          node --env-file=.env src\beispiele.mts

import { abbildungTable, buchTable, titelTable } from './db/schema.mts';
import { eq, sql } from 'drizzle-orm';
import { type PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFile } from 'node:fs/promises';
import { styleText } from 'node:util';

let message: string;

// https://orm.drizzle.team/docs/insert
type BuchInsert = typeof buchTable.$inferInsert;
const neuesBuch: BuchInsert = {
    // Spaltentyp "text"
    isbn: '978-0-007-00644-1',
    // Spaltentyp "integer"
    rating: 1,
    // Spaltentyp "enum('HARDCOVER', ...)"
    art: 'HARDCOVER',
    // number -> Spaltentyp "numeric"
    preis: '99.99',
    rabatt: '0.0123',
    // Spaltentyp "boolean"
    lieferbar: true,
    // Datum im Format ISO8601 fuer Spaltentyp "date"
    datum: '2026-02-28T00:00:00Z',
    homepage: 'https://beispiele.drizzle',
    // Spaltentyp "jsonb"
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
};

// ohne Fremdschluessel-Spalte
type TitelInsert = Omit<typeof titelTable.$inferInsert, 'buchId'>;
const neuerTitel: TitelInsert = {
    titel: 'Beispiel',
    untertitel: 'beispiel',
};

// ohne Fremdschluessel-Spalte
type AbbildungInsert = Omit<typeof abbildungTable.$inferInsert, 'buchId'>;
const neueAbbildungen: AbbildungInsert[] = [
    {
        beschriftung: 'Abb. 1',
        contentType: 'img/png',
    },
];

type BuchUpdate = PgUpdateSetSource<typeof buchTable>;
const geaendertesBuch: BuchUpdate = {
    version: 1,
    rating: 5,
    art: 'HARDCOVER',
    preis: '3333',
    rabatt: '0.033',
    lieferbar: true,
    datum: '2026-03-03T00:00:00Z',
    homepage: 'https://geaendert.put.rest',
    schlagwoerter: ['JAVA'],
};

// Drizzle-Client mit DB-User "buch"
const db = drizzle({
    connection: {
        user: 'buch',
        database: 'buch',
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

// Operationen mit "buchTable" aus "db/schema.mts"
try {
    // COMMIT, wenn der Callback bzw. Arrow-Function erfolgreich ist
    // ROLLBACK, wenn ein Error geworfen wird
    await db.transaction(async (tx) => {
        // https://orm.drizzle.team/docs/insert
        const [buchInsert] = await tx.insert(buchTable).values(neuesBuch).returning();
        if (buchInsert === undefined) {
            throw new Error('Das Buch wurde nicht eingefuegt.');
        }
        const buchId = buchInsert.id;

        // Spread Operator
        const [titelInsert] = await tx
            .insert(titelTable)
            .values({ ...neuerTitel, buchId })
            .returning();
        if (titelInsert === undefined) {
            throw new Error('Der Titel wurde nicht eingefuegt.');
        }

        const abbildungenInsert = await Promise.all(
            neueAbbildungen.map(async (abbildung) => {
                const [abbildungInsert] = await tx
                    .insert(abbildungTable)
                    .values({ ...abbildung, buchId })
                    .returning({ id: abbildungTable.id });
                if (abbildungInsert === undefined) {
                    throw new Error('Die Abbildung wurde nicht eingefuegt.');
                }
                return abbildungInsert;
            }),
        );

        message = styleText(['black', 'bgWhite'], 'Generierte IDs');
        console.log(`${message}: %j`, {
            buch: [buchInsert.id, buchInsert.erzeugt],
            titel: titelInsert.id,
            abbildungen: abbildungenInsert.map((abb) => abb.id),
        });

        // https://orm.drizzle.team/docs/update
        const [buchUpdate] = await tx
            .update(buchTable)
            .set({
                // Spread-Operator
                ...geaendertesBuch,
                // Funktion "now" von SQL durch den Template-String aufrufen
                aktualisiert: sql`now()`,
            })
            .where(eq(buchTable.id, 30))
            .returning();

        message = styleText(['black', 'bgWhite'], 'Neue Version');
        console.log(`${message}: %s, %s`, buchUpdate?.version, buchUpdate?.aktualisiert);

        // https://orm.drizzle.team/docs/delete
        // "CREATE TABLE" mit "ON DELETE CASCADE"
        const buchDelete = await tx.delete(buchTable).where(eq(buchTable.id, 70)).returning();
        message = styleText(['black', 'bgWhite'], 'Anzahl DELETE');
        console.log(`${message}: `, buchDelete.length);
    });
} finally {
    await db.$client.end();
}
