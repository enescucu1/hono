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
 * Das Modul sammelt Metriken für Prometheus: die Standardmetriken von Node.js sowie die Anzahl und
 * die Dauer der HTTP-Requests. Die Labels sind die Methode, die Route (zum Beispiel "/rest/:id" und
 * nicht "/rest/20", sonst gäbe es für jede ID eine eigene Zeitreihe) und der Statuscode.
 * @packageDocumentation
 */

import { type Context, type Next } from 'hono';
import { Counter, Histogram, collectDefaultMetrics } from '@prometheus-io/client';
import { defineMiddleware } from 'hono/factory';
import { routePath } from 'hono/route';

// Standardmetriken (Speicher, CPU, Event Loop, ...)
collectDefaultMetrics();

const labelNames = ['method', 'path', 'status_code'] as const;
const millisPerSecond = 1000;
// Grenzen in Sekunden
// oxlint-disable-next-line no-magic-numbers
const buckets = [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5];

const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Gesamte Anzahl an HTTP-Requests',
    labelNames,
});

const httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Dauer von HTTP-Requests in Sekunden',
    labelNames,
    buckets,
});

/**
 * Middleware: erfasst nach jedem Request Anzahl und Dauer.
 */
export const trackMetrics = defineMiddleware(async (c: Context, next: Next) => {
    const start = performance.now();

    await next(); // oxlint-disable-line node/callback-return

    const labels = {
        method: c.req.method,
        // die Route des Handlers (letzter Treffer), nicht die der Middleware ("/*")
        path: routePath(c, -1),
        status_code: c.res.status,
    };
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, (performance.now() - start) / millisPerSecond);
});
