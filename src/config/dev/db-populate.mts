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

/**
 * Das Modul enthält die Funktionalität, um die DB neu zu laden: die Tabellen werden
 * gelöscht, neu angelegt und mit den CSV-Dateien gefüllt (nur in der Entwicklung).
 * @packageDocumentation
 */

import { configURL, getConfig } from '../config.mts';
import { URL } from 'node:url';
import { db } from '../db.mts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getLogger } from '../../logger/logger.mts';
import { readFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';

const config = await getConfig();
const {
    admin,
    adminPassword,
    database,
    host,
    cert,
    tlsMinVersion,
    tlsMaxVersion,
    poolIdleTimeoutMillis,
    poolConnectionTimeoutMillis,
    populate: activated,
} = config.db;

// SQL-Skripte im Verzeichnis "postgresql"
const sqlURL = new URL('postgresql/', configURL);

const logger = getLogger('populate', 'func');

export const isPopulateActivated = () => activated;

// Zum Laden der CSV-Dateien mit COPY sind Administrationsrechte noetig:
// https://www.postgresql.org/docs/current/sql-copy.html
const copyCsv = async (copyStatements: string) => {
    const dbAdmin = drizzle({
        connection: {
            user: admin,
            database,
            password: adminPassword,
            host,
            ssl: {
                cert: await readFile(new URL(cert, new URL('..', configURL))),
                minVersion: tlsMinVersion,
                maxVersion: tlsMaxVersion,
            },
            sslnegotiation: 'direct',
            max: 1,
            idleTimeoutMillis: poolIdleTimeoutMillis,
            connectionTimeoutMillis: poolConnectionTimeoutMillis,
        },
    });
    try {
        await dbAdmin.transaction(async (tx) => {
            await tx.execute(sql.raw(copyStatements));
        });
    } finally {
        await dbAdmin.$client.end();
    }
};

/**
 * Die Test-DB wird neu geladen, wenn `populate = true` in `config.toml` gesetzt ist.
 * Bei einem Fehler wird dieser protokolliert und weitergegeben.
 */
export const populate = async () => {
    if (!activated) {
        logger.warn('Das Neuladen der DB ist nicht aktiviert (populate in config.toml)');
        return;
    }
    if (adminPassword === undefined) {
        throw new Error('Fuer das Neuladen der DB fehlt adminPassword in config.toml');
    }

    logger.warn('Die DB wird neu geladen');

    const dropStatements = await readFile(new URL('drop-table.sql', sqlURL), 'utf8');
    const createStatements = await readFile(new URL('create-table.sql', sqlURL), 'utf8');
    const copyStatements = await readFile(new URL('copy-csv.sql', sqlURL), 'utf8');

    try {
        // https://orm.drizzle.team/docs/sql
        await db.transaction(async (tx) => {
            await tx.execute(sql.raw(dropStatements));
            await tx.execute(sql.raw(createStatements));
        });
        await copyCsv(copyStatements);
    } catch (error: unknown) {
        logger.error('Fehler beim Neuladen der DB: %o', error as object);
        throw error;
    }

    logger.warn('Die DB wurde neu geladen');
};
