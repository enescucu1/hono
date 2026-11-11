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

import { type ClientErrorStatusCode, type ServerErrorStatusCode } from 'hono/utils/http-status';
import { type Context } from 'hono';

export const badRequest = 400;
export const unauthorized = 401;
export const forbidden = 403;
export const notFound = 404;
export const preconditionFailed = 412;
export const unprocessableContent = 422;
export const preconditionRequired = 428;
export const internalServerError = 500;
export const serviceUnavailable = 503;

export type ProblemDetails = {
    title: string;
    statusCode: ClientErrorStatusCode | ServerErrorStatusCode;
    detail: unknown;
};

// Titel zum Statuscode
const titles = new Map<number, string>([
    [badRequest, 'Bad Request'],
    [unauthorized, 'Unauthorized'],
    [forbidden, 'Forbidden'],
    [notFound, 'Not Found'],
    [preconditionFailed, 'Precondition Failed'],
    [unprocessableContent, 'Unprocessable Content'],
    [preconditionRequired, 'Precondition Required'],
    [internalServerError, 'Internal Server Error'],
    [serviceUnavailable, 'Service Unavailable'],
]);

/**
 * Problem Details für HTTP APIs gemäß RFC 9457, vereinfacht wie im Beispiel des Dozenten:
 * `title`, `statusCode` und `detail`. Das Resultat hat den Content-Type
 * `application/problem+json`. Siehe https://www.rfc-editor.org/rfc/rfc9457
 * @param ctx Context von Hono
 * @param statusCode HTTP-Statuscode
 * @param detail Erläuterung zum Fehler, z.B. ein Text oder die Fehler von Zod
 * @returns Response gemäß Fetch-API
 */
export const createProblemDetails = (
    ctx: Context,
    statusCode: ClientErrorStatusCode | ServerErrorStatusCode,
    detail?: unknown,
): Response => {
    const title = titles.get(statusCode) ?? (statusCode < 500 ? 'Client Error' : 'Server Error');
    const problemDetails: ProblemDetails = { title, statusCode, detail };

    // https://hono.dev/docs/api/context#json
    const response = ctx.json(problemDetails, statusCode);
    response.headers.set('Content-Type', 'application/problem+json');
    return response;
};
