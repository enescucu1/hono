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
 * Das Modul prüft den Access Token von Keycloak (JWT) und die Rollen des Benutzers. Es wird von der
 * Middleware für REST und von den Resolvern für GraphQL benutzt.
 * @packageDocumentation
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { forbidden, unauthorized } from '../problem-details.mts';
import { JOSEError } from 'jose/errors';
import { getConfig } from '../config/config.mts';
import { getLogger } from '../logger/logger.mts';

/** Rollen, die als Client-Rollen in Keycloak angelegt sind. */
export type Rolle = 'admin' | 'user';

/** Ergebnis der Prüfung: gültiger Token mit passender Rolle oder Fehler mit Statuscode. */
export type Pruefung =
    | Readonly<{ ok: true }>
    | Readonly<{ ok: false; status: typeof unauthorized | typeof forbidden; detail: string }>;

const logger = getLogger('token-pruefen');
const { audience, clientId, host, https, port, realm } = (await getConfig()).keycloak;

const issuer = `${https ? 'https' : 'http'}://${host}:${port}/realms/${realm}`;
// Die öffentlichen Schlüssel von Keycloak werden beim ersten Token geladen und dann zwischengespeichert
const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
const algorithms = ['RS256'];
const bearer = 'Bearer ';

const abgelehnt = (status: typeof unauthorized | typeof forbidden, detail: string): Pruefung => {
    return { ok: false, status, detail };
};

// Rollen des Clients stehen im Token unter resource_access.<clientId>.roles
const getRollen = (payload: unknown): readonly string[] => {
    const rollen = (payload as { resource_access?: Record<string, { roles?: unknown }> })
        .resource_access?.[clientId]?.roles;
    return Array.isArray(rollen)
        ? rollen.filter((rolle): rolle is string => typeof rolle === 'string')
        : [];
};

/**
 * Prüft den Header "Authorization: Bearer <Token>": Signatur, Aussteller, Audience und Ablaufzeit
 * des JWTs sowie mindestens eine der geforderten Rollen.
 * Der Token selbst wird nie protokolliert.
 * @param authorization Wert des Headers Authorization
 * @param rollen Rollen, von denen mindestens eine vorhanden sein muss
 * @returns Ergebnis der Prüfung
 */
export const pruefeToken = async (
    authorization: string | null | undefined,
    ...rollen: readonly Rolle[]
): Promise<Pruefung> => {
    if (!authorization?.startsWith(bearer)) {
        return abgelehnt(unauthorized, 'Der Header Authorization mit einem Bearer-Token fehlt.');
    }
    const token = authorization.slice(bearer.length);

    let payload: unknown;
    try {
        // iat, exp und nbf werden von jose implizit geprüft
        ({ payload } = await jwtVerify(token, jwks, { issuer, audience, algorithms }));
    } catch (error) {
        if (error instanceof JOSEError) {
            logger.debug('Token abgelehnt: code=%s', error.code);
            return abgelehnt(unauthorized, 'Der Token ist ungueltig oder abgelaufen.');
        }
        // z.B. Keycloak nicht erreichbar: Fehler im Server
        throw error;
    }

    const vorhanden = getRollen(payload);
    logger.debug('Rollen im Token: %o', vorhanden);
    if (!rollen.some((rolle) => vorhanden.includes(rolle))) {
        return abgelehnt(forbidden, 'Die erforderliche Rolle fehlt.');
    }
    return { ok: true };
};
