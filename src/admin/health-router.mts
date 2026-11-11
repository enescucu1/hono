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

import { createProblemDetails, serviceUnavailable } from '../problem-details.mts';
import { Hono } from 'hono';
import { db } from '../config/db.mts';
import { getLogger } from '../logger/logger.mts';
import { sql } from 'drizzle-orm';

/**
 * Router für Liveness und Readiness (zum Beispiel für Docker und Kubernetes):
 * - `GET /health/liveness`: der Server läuft
 * - `GET /health/readiness`: der Server kann Requests bearbeiten, d.h. die Datenbank antwortet
 */
export const healthRouter = new Hono();

const logger = getLogger('health-router');

healthRouter.get('/liveness', (c) => c.json({ status: 'up' }));

healthRouter.get('/readiness', async (c) => {
    try {
        await db.execute(sql`select 1`);
    } catch (error) {
        logger.warn('Readiness: Die DB ist nicht erreichbar: %o', error as object);
        return createProblemDetails(c, serviceUnavailable, 'Die Datenbank ist nicht erreichbar.');
    }
    return c.json({ status: 'up' });
});
