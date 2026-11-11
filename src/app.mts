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

import { type Context, Hono, type Next } from 'hono';
import {
    badRequest,
    createProblemDetails,
    internalServerError,
    notFound,
} from './problem-details.mts';
import { type ClientErrorStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { corsOptions } from './config/cors-options.mts';
import { defineMiddleware } from 'hono/factory';
import { devRouter } from './config/dev/dev-router.mts';
import { getConfig } from './config/config.mts';
import { getLogger } from './logger/logger.mts'; // oxlint-disable-line import/max-dependencies
import { graphqlRouter } from './rezept/graphql/graphql.router.mts';
import { paths } from './config/paths.mts';
import { requestLogger } from './logger/request-logger.mts';
import { responseTime } from './logger/response-time.mts';
import { rezeptGetRouter } from './rezept/rest/rezept-get.router.mts';
import { rezeptWriteRouter } from './rezept/rest/rezept-write.router.mts';
import { secureHeaders } from 'hono/secure-headers';

// Web-Applikation mit Hono: Middleware und Routen fuer REST und GraphQL
export const app = new Hono();

const logger = getLogger('app');
const config = await getConfig();
const { nodeEnv } = config.server;

// -----------------------------------------------------------------------------
// M i d d l e w a r e
// -----------------------------------------------------------------------------
// Globale Middleware muss vor den Routen registriert werden
// https://hono.dev/docs/guides/middleware#execution-order

// Zusaetzliche Security-Header
const securityHeaders = defineMiddleware(async (c: Context, next: Next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    return await next();
});

// https://hono.dev/docs/middleware/builtin/secure-headers
// https://hono.dev/docs/middleware/builtin/cors
// https://hono.dev/docs/middleware/builtin/compress
app.use(secureHeaders(), cors(corsOptions), securityHeaders, compress());

// Antwortzeit und Requests nur bei Log-Level "debug" protokollieren
if (logger.isLevelEnabled('debug')) {
    app.use(responseTime, requestLogger);
}

// -----------------------------------------------------------------------------
// R o u t e n
// -----------------------------------------------------------------------------
app.route(paths.rest, rezeptGetRouter);
app.route(paths.rest, rezeptWriteRouter);
app.route(paths.graphql, graphqlRouter);

// Routen fuer die Entwicklung (DB neu laden), nie in Produktion
if (nodeEnv === 'development') {
    app.route(paths.dev, devRouter);
}

// -----------------------------------------------------------------------------
// F e h l e r b e h a n d l u n g
// -----------------------------------------------------------------------------
// Problem Details gemaess RFC 9457
app.notFound((c) =>
    createProblemDetails(
        c,
        notFound,
        `Die Ressource ${new URL(c.req.url).pathname} gibt es nicht.`,
    ),
);

// https://hono.dev/docs/api/exception#handling-httpexceptions
// oxlint-disable-next-line promise/prefer-await-to-callbacks
app.onError((error, c) => {
    // z.B. fehlerhafte Requests, die Hono selbst erkennt
    if (
        error instanceof HTTPException &&
        error.status >= badRequest &&
        error.status < internalServerError
    ) {
        return createProblemDetails(c, error.status as ClientErrorStatusCode, error.message);
    }

    // alles andere ist ein Fehler im Server und wird nur protokolliert
    logger.error('Unerwarteter Fehler: %o', error);
    return createProblemDetails(c, internalServerError);
});
