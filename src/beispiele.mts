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
//
//          node --env-file=.env src\beispiele.mts
//          bun --env-file=.env src\beispiele.mts

import { abbildungTable, buchTable, titelTable } from './db/schema.mts';
import { eq, ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFile } from 'node:fs/promises';
import { styleText } from 'node:util';

let message: string;

// Drizzle-Client mit DB-User "buch"
// Default-Werte fuer Connection Pool:
//  Maximum connections: 10
//  Minimum connections: 0
//  Idle timeout: 10 Sekunden
//  Connection timeout: unbegrenzt
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
        max: 5,
        idleTimeoutMillis: 30_000, // Timeout, wie lange eine Verbindung inaktive ist, bevor sie geschlossen wird
        connectionTimeoutMillis: 5_000, // Timeout fuer Aufbau der DB-Verbindung
    },
    logger: true,
});

type BuchSelect = typeof buchTable.$inferSelect;
type TitelSelect = typeof titelTable.$inferSelect;
type AbbildungSelect = typeof abbildungTable.$inferSelect;

// Operationen mit "buchTable" aus "db/schema.mts"
// Zum Lesen ist keine Transaktion notwendig
try {
    // https://orm.drizzle.team/docs/select
    // https://orm.drizzle.team/docs/operators
    // falls kein Datensatz gefunden wurde, ist das JSON-Array leer und buch ist dann undefined
    // Array Destructuring
    const [buch]: BuchSelect[] = await db
        .select()
        .from(buchTable)
        .where(eq(buchTable.id, 1))
        .limit(1);
    message = styleText(['black', 'bgWhite'], 'buch');
    console.log(`${message}: %j`, buch);
    console.log();

    // Pagination: Seite 1, max 2 Eintraege pro Seite
    const buecherPage1: BuchSelect[] = await db.select().from(buchTable).limit(2).offset(0);
    message = styleText(['black', 'bgWhite'], 'buecherPage1');
    console.log(`${message}: %j`, buecherPage1);
    console.log();

    // Pagination: Seite 3, max 2 Eintraege pro Seite
    const buecherPage2: BuchSelect[] = await db.select().from(buchTable).limit(2).offset(4);
    message = styleText(['black', 'bgWhite'], 'buecherPage2');
    console.log(`${message}: %j`, buecherPage2);
    console.log();

    // SELECT     *
    // FROM       buch
    // INNER JOIN titel ON buch.id = titel.buch_id
    // INNER JOIN abbildung ON buch.id = abbildung.buch_id
    // WHERE      titel.titel LIKE "%n%"
    const buecher: {
        buch: BuchSelect;
        titel: TitelSelect;
        abbildung: AbbildungSelect;
    }[] = await db
        .select()
        .from(buchTable)
        .innerJoin(titelTable, eq(buchTable.id, titelTable.buchId))
        .innerJoin(abbildungTable, eq(buchTable.id, abbildungTable.buchId))
        .where(ilike(titelTable.titel, '%n%'));
    message = styleText(['black', 'bgWhite'], 'buecher');
    console.log(`${message}: %j`, buecher);
    console.log();

    // SELECT id
    // FROM   buch
    // WHERE  isbn = "978-3-897-22583-1"
    // LIMIT  1
    const isbnCheck = await db
        .select({ id: buchTable.id })
        .from(buchTable)
        .where(eq(buchTable.isbn, '978-3-897-22583-1'))
        .limit(1);
    const exists = isbnCheck.length > 0;
    message = styleText(['black', 'bgWhite'], 'ISBN exists?');
    console.log(`${message}: %s`, exists);
    console.log();
} finally {
    await db.$client.end();
}

// Drizzle-Client mit DB-User "postgres"
const admin = drizzle({
    connection: {
        user: 'postgres',
        database: 'buch',
        password: 'p',
        host: 'localhost',
        ssl: {
            cert: await readFile(
                new URL('./config/postgresql/server.crt', import.meta.url),
                'utf8',
            ),
            minVersion: 'TLSv1.3',
            maxVersion: 'TLSv1.3',
        },
    },
    logger: true,
});
try {
    const buecherAdmin: {
        buch: BuchSelect;
        titel: TitelSelect;
        abbildung: AbbildungSelect;
    }[] = await admin
        .select()
        .from(buchTable)
        .innerJoin(titelTable, eq(buchTable.id, titelTable.buchId))
        .innerJoin(abbildungTable, eq(buchTable.id, abbildungTable.buchId))
        .where(ilike(titelTable.titel, '%n%'));
    message = styleText(['black', 'bgWhite'], 'buecherAdmin');
    console.log(`${message}: %j`, buecherAdmin);
    console.log();
} finally {
    await admin.$client.end();
}
