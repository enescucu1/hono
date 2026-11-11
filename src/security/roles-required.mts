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
import { type Rolle, pruefeToken } from './token-pruefen.mts';
import { createProblemDetails } from '../problem-details.mts';
import { defineMiddleware } from 'hono/factory';

/**
 * Middleware für REST: Der Request braucht einen gültigen Access Token von Keycloak mit mindestens
 * einer der Rollen. Sonst antwortet der Server mit 401 (kein gültiger Token) oder 403 (Rolle fehlt)
 * als Problem Details.
 * @param rollen Rollen, von denen mindestens eine vorhanden sein muss
 */
export const rolesRequired = (...rollen: readonly Rolle[]) =>
    defineMiddleware(async (c: Context, next: Next) => {
        const pruefung = await pruefeToken(c.req.header('Authorization'), ...rollen);
        if (!pruefung.ok) {
            if (pruefung.status === 401) {
                c.header('WWW-Authenticate', 'Bearer');
            }
            return createProblemDetails(c, pruefung.status, pruefung.detail);
        }
        return await next();
    });
