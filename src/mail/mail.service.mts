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

import { createTransport } from 'nodemailer';
import { getConfig } from '../config/config.mts';
import { getLogger } from '../logger/logger.mts';

const logger = getLogger('mail-service');

const config = await getConfig();
const { enabled, from, host, port, to } = config.mail;

// Timeout in Millisekunden, damit ein nicht erreichbarer Mailserver das Anlegen nicht blockiert
const mailTimeout = 5000;

// ignoreTLS: Mailpit hat keinen TLS-Zugang auf Port 1025
const transporter = createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: true,
    connectionTimeout: mailTimeout,
    greetingTimeout: mailTimeout,
    socketTimeout: mailTimeout,
});

export type NeuesRezeptMail = Readonly<{ id: number; rezeptnummer: string; titel: string }>;

// Mail an die Redaktion, dass ein Rezept angelegt wurde
// Ein Fehler beim Senden wird nur protokolliert: das Rezept ist ja schon in der DB gespeichert
export const sendNeuesRezeptMail = async ({ id, rezeptnummer, titel }: NeuesRezeptMail) => {
    if (!enabled) {
        logger.warn('Mail deaktiviert');
        return;
    }

    try {
        await transporter.sendMail({
            from,
            to,
            subject: `Neues Rezept: ID=${id}`,
            text: `Das Rezept ${rezeptnummer} mit dem Titel "${titel}" wurde angelegt.`,
        });
    } catch (error: unknown) {
        logger.error(
            `Die Mail zum neuen Rezept ${id} konnte nicht gesendet werden: %o`,
            error as object,
        );
    }
};
