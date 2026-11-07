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

import { eq, ilike } from 'drizzle-orm';
import { rezeptTable, titelTable, zutatTable } from './db/schema.mts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFile } from 'node:fs/promises';
import { relations } from './db/relations.mts';
import { styleText } from 'node:util';

let message: string;

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
        max: 5,
        idleTimeoutMillis: 30_000, // Timeout, wie lange eine Verbindung inaktive ist, bevor sie geschlossen wird
        connectionTimeoutMillis: 5_000, // Timeout fuer Aufbau der DB-Verbindung
    },
    // fuer die relationalen Abfragen mit "db.query"
    relations,
    logger: true,
});

type RezeptSelect = typeof rezeptTable.$inferSelect;
type TitelSelect = typeof titelTable.$inferSelect;
type ZutatSelect = typeof zutatTable.$inferSelect;

try {
    // https://orm.drizzle.team/docs/select
    // https://orm.drizzle.team/docs/operators
    // falls kein Datensatz gefunden wurde, ist das JSON-Array leer und rezept ist dann undefined
    // Array Destructuring
    const [rezept]: RezeptSelect[] = await db
        .select()
        .from(rezeptTable)
        .where(eq(rezeptTable.id, 1))
        .limit(1);
    message = styleText(['black', 'bgWhite'], 'rezept');
    console.log(`${message}: %j`, rezept);
    console.log();

    // Pagination: Seite 1, max 2 Eintraege pro Seite
    const rezepteSeite1: RezeptSelect[] = await db.select().from(rezeptTable).limit(2).offset(0);
    message = styleText(['black', 'bgWhite'], 'rezepteSeite1');
    console.log(`${message}: %j`, rezepteSeite1);
    console.log();

    // Pagination: Seite 3, max 2 Eintraege pro Seite
    const rezepteSeite3: RezeptSelect[] = await db.select().from(rezeptTable).limit(2).offset(4);
    message = styleText(['black', 'bgWhite'], 'rezepteSeite3');
    console.log(`${message}: %j`, rezepteSeite3);
    console.log();

    // SELECT     *
    // FROM       rezept
    // INNER JOIN titel ON rezept.id = titel.rezept_id
    // INNER JOIN zutat ON rezept.id = zutat.rezept_id
    // WHERE      titel.titel ILIKE "%suppe%"
    const rezepte: {
        rezept: RezeptSelect;
        titel: TitelSelect;
        zutat: ZutatSelect;
    }[] = await db
        .select()
        .from(rezeptTable)
        .innerJoin(titelTable, eq(rezeptTable.id, titelTable.rezeptId))
        .innerJoin(zutatTable, eq(rezeptTable.id, zutatTable.rezeptId))
        .where(ilike(titelTable.titel, '%suppe%'));
    message = styleText(['black', 'bgWhite'], 'rezepte');
    console.log(`${message}: %j`, rezepte);
    console.log();

    // Relationale Abfrage: Rezept mit Titel (1:1) und Zutaten (1:n)
    // https://orm.drizzle.team/docs/rqb-v2
    const rezeptMitRelationen = await db.query.rezeptTable.findFirst({
        where: { id: 20 },
        with: { titel: true, zutaten: true },
    });
    message = styleText(['black', 'bgWhite'], 'rezeptMitRelationen');
    console.log(`${message}: %j`, rezeptMitRelationen);
    console.log();

    // SELECT id
    // FROM   rezept
    // WHERE  rezeptnummer = "RZ-001"
    // LIMIT  1
    const rezeptnummerCheck = await db
        .select({ id: rezeptTable.id })
        .from(rezeptTable)
        .where(eq(rezeptTable.rezeptnummer, 'RZ-001'))
        .limit(1);
    const exists = rezeptnummerCheck.length > 0;
    message = styleText(['black', 'bgWhite'], 'Rezeptnummer exists?');
    console.log(`${message}: %s`, exists);
    console.log();
} finally {
    await db.$client.end();
}

const admin = drizzle({
    connection: {
        user: 'postgres',
        database: 'rezept',
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
    const rezepteAdmin: {
        rezept: RezeptSelect;
        titel: TitelSelect;
        zutat: ZutatSelect;
    }[] = await admin
        .select()
        .from(rezeptTable)
        .innerJoin(titelTable, eq(rezeptTable.id, titelTable.rezeptId))
        .innerJoin(zutatTable, eq(rezeptTable.id, zutatTable.rezeptId))
        .where(ilike(titelTable.titel, '%suppe%'));
    message = styleText(['black', 'bgWhite'], 'rezepteAdmin');
    console.log(`${message}: %j`, rezepteAdmin);
    console.log();
} finally {
    await admin.$client.end();
}
