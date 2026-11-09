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

import { type Context, type Next } from 'hono';
import { defineMiddleware } from 'hono/factory';
import { getLogger } from './logger.mts';

const logger = getLogger('responseTime', 'func');

/**
 * Middleware für Hono, um nach dem Bearbeiten eines Requests dessen Antwortzeit
 * und den Statuscode zu protokollieren.
 */
// https://hono.dev/docs/guides/middleware
export const responseTime = defineMiddleware(async (c: Context, next: Next) => {
    const start = performance.now();
    await next(); // oxlint-disable-line node/callback-return
    const duration = Math.round(performance.now() - start);
    logger.debug('Response time: %d ms, Status: %d', duration, c.res.status);
});
