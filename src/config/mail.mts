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

// Mailpit: SMTP-Server ohne TLS auf Port 1025 (Weboberflaeche: http://localhost:8025)
export const smtpHost = 'localhost';
export const smtpPort = 1025;

export const absender = 'Rezept Server <rezept@acme.com>';
export const empfaenger = 'Redaktion <redaktion@acme.com>';

// Timeout in Millisekunden, damit ein nicht erreichbarer Mailserver das Anlegen nicht blockiert
export const mailTimeout = 5000;
