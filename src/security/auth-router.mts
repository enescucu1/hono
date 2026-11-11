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

import {
    badRequest,
    createProblemDetails,
    serviceUnavailable,
    unauthorized,
    unprocessableContent,
} from '../problem-details.mts';
import { invalidJson, readJson } from '../rezept/rest/read-json.mts';
import { Hono } from 'hono';
import { token } from './keycloak-service.mts';
import { z } from 'zod';

// Eingabe: { "username": "admin", "password": "p" }
const zugangsdatenSchema = z.strictObject({
    username: z.string().min(1),
    password: z.string().min(1),
});

/**
 * Router für die Authentifizierung: Der Server holt den Access Token bei Keycloak, damit ein Client
 * nicht direkt mit Keycloak reden muss. QUERY wie beim Dozenten, zusätzlich POST (Bruno).
 */
export const authRouter = new Hono();

authRouter.on(['QUERY', 'POST'], '/token', async (c) => {
    const body = await readJson(c);
    if (body === invalidJson) {
        return createProblemDetails(c, badRequest, 'Der Request-Body ist kein gueltiges JSON.');
    }
    const zugangsdaten = zugangsdatenSchema.safeParse(body);
    if (!zugangsdaten.success) {
        return createProblemDetails(c, unprocessableContent, z.flattenError(zugangsdaten.error));
    }

    const result = await token(zugangsdaten.data.username, zugangsdaten.data.password);
    switch (result.status) {
        case 'ungueltig': {
            return createProblemDetails(c, unauthorized, 'Benutzername oder Passwort sind falsch.');
        }
        case 'nicht-erreichbar': {
            return createProblemDetails(c, serviceUnavailable, 'Keycloak ist nicht erreichbar.');
        }
        default: {
            // Token dürfen nicht zwischengespeichert werden
            c.header('Cache-Control', 'no-store');
            return c.json(result.token);
        }
    }
});
