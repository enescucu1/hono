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

import { app } from './app.mts';
import { createSecureServer } from 'node:http2';
import { disconnectDB } from './config/db.mts';
import { getConfig } from './config/config.mts';
import { getLogger } from './logger/logger.mts';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { serve } from '@hono/node-server';

const logger = getLogger('server');

// "Top-level await"
const config = await getConfig();
const { allowHTTP1, certFile, keyFile, port } = config.server;

// privater Schluessel und Zertifikat fuer TLS (selbst-signiert, nur fuer die Entwicklung)
const key = await readFile(keyFile, { encoding: 'utf8' });
const cert = await readFile(certFile, { encoding: 'utf8' });

// HTTP/2 mit TLS 1.3, allowHTTP1 wegen Bruno (nur HTTP 1.1)
const server = serve(
    {
        fetch: app.fetch,
        port,
        createServer: createSecureServer,
        serverOptions: {
            key,
            cert,
            minVersion: 'TLSv1.3',
            maxVersion: 'TLSv1.3',
            allowHTTP1,
        },
    },
    (info) => {
        logger.info(`Der Appserver laeuft auf https://localhost:${info.port}`);
    },
);

// Strg+C: keine neuen Requests mehr, DB-Verbindungen schliessen
process.on('SIGINT', () => {
    logger.info('Der Server wird heruntergefahren.');
    server.close();
    (async () => {
        try {
            await disconnectDB();
        } catch {
            logger.error('Fehler beim Trennen der DB-Verbindung.');
        }
    })();
});
