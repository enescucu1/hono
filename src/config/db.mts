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

import { configURL, getConfig } from './config.mts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getLogger } from '../logger/logger.mts';
import { readFile } from 'node:fs/promises';
import { relations } from '../db/relations.mts';

const logger = getLogger('db');

const config = await getConfig();
const {
    user,
    database,
    password,
    host,
    cert,
    tlsMinVersion,
    tlsMaxVersion,
    poolMax,
    poolIdleTimeoutMillis,
    poolConnectionTimeoutMillis,
} = config.db;
const { nodeEnv } = config.server;

// Drizzle-Client mit dem DB-User aus config.toml (Standard: "rezept")
export const db = drizzle({
    connection: {
        user,
        database,
        password,
        host,
        ssl: {
            // cert ist relativ zum Verzeichnis "src"
            cert: await readFile(new URL(cert, new URL('..', configURL))),
            minVersion: tlsMinVersion,
            maxVersion: tlsMaxVersion,
        },
        sslnegotiation: 'direct',
        // Connection Pool
        max: poolMax,
        idleTimeoutMillis: poolIdleTimeoutMillis, // Timeout, wie lange eine Verbindung inaktiv ist, bevor sie geschlossen wird
        connectionTimeoutMillis: poolConnectionTimeoutMillis, // Timeout fuer Aufbau der DB-Verbindung
    },
    // fuer die relationalen Abfragen mit "db.query"
    relations,
    // SQL-Logging nur in der Entwicklung
    logger: nodeEnv === 'development',
});

// DB-Verbindungen des Pools beim Beenden des Servers schliessen
export const disconnectDB = async () => {
    await db.$client.end();
    logger.info('Die DB-Verbindung ist getrennt.');
};
