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

import { drizzle } from 'drizzle-orm/node-postgres';
import { readFile } from 'node:fs/promises';
import { relations } from '../db/relations.mts';

// Drizzle-Client mit DB-User "rezept"
export const db = drizzle({
    connection: {
        user: 'rezept',
        database: 'rezept',
        password: 'p',
        host: 'localhost',
        ssl: {
            cert: await readFile(new URL('postgresql/server.crt', import.meta.url)),
            minVersion: 'TLSv1.3',
            maxVersion: 'TLSv1.3',
        },
        sslnegotiation: 'direct',
        // Connection Pool
        max: 10,
        idleTimeoutMillis: 30_000, // Timeout, wie lange eine Verbindung inaktive ist, bevor sie geschlossen wird
        connectionTimeoutMillis: 5_000, // Timeout fuer Aufbau der DB-Verbindung
    },
    // fuer die relationalen Abfragen mit "db.query"
    relations,
    logger: true,
});
