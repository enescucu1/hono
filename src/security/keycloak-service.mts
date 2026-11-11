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
 * Das Modul holt Access Token von Keycloak (Password Grant, d.h. Benutzername und Passwort).
 * Benutzername, Passwort und Tokens werden nicht protokolliert.
 * @packageDocumentation
 */

import { getConfig } from '../config/config.mts';
import { getLogger } from '../logger/logger.mts';

const logger = getLogger('keycloak-service');
const { clientId, clientSecret, host, https, port, realm } = (await getConfig()).keycloak;
const tokenUrl = `${https ? 'https' : 'http'}://${host}:${port}/realms/${realm}/protocol/openid-connect/token`;

/** Antwort von Keycloak auf eine erfolgreiche Anmeldung (Auszug). */
export type TokenResponse = Readonly<{
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
    token_type: string;
}>;

/** Ergebnis: Token, ungültige Zugangsdaten oder Keycloak nicht erreichbar. */
export type TokenResult =
    | Readonly<{ status: 'ok'; token: TokenResponse }>
    | Readonly<{ status: 'ungueltig' | 'nicht-erreichbar' }>;

const httpOk = 200;

/**
 * Fordert bei Keycloak einen Access Token für den Benutzer an.
 * @param username Benutzername
 * @param password Passwort
 * @returns Token oder der Grund, warum es keinen gibt
 */
export const token = async (username: string, password: string): Promise<TokenResult> => {
    // https://www.keycloak.org/docs-api/latest/rest-api
    const body = new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        client_secret: clientSecret,
        username,
        password,
    });

    let response: Response;
    try {
        response = await fetch(tokenUrl, { method: 'POST', body });
    } catch (error) {
        logger.warn('Keycloak ist nicht erreichbar: %o', error as object);
        return { status: 'nicht-erreichbar' };
    }

    if (response.status !== httpOk) {
        // 401 bei falschem Passwort. Bei einem falschen Client Secret (ebenfalls 401) steht der
        // Grund nur im Keycloak-Log.
        logger.debug('Keycloak hat die Anmeldung abgelehnt: status=%d', response.status);
        return { status: 'ungueltig' };
    }
    return { status: 'ok', token: (await response.json()) as TokenResponse };
};
