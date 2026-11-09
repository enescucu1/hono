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

// ETag und If-Match enthalten die Versionsnummer in Anfuehrungszeichen, z.B. "0".
// hono/compress macht den ETag einer komprimierten Antwort zu einem schwachen ETag (W/"0").
// Den Wert schicken Clients dann bei If-Match oder If-None-Match zurueck, deshalb ist W/ erlaubt.
const versionPattern = /^(?:W\/)?"(?<version>\d+)"$/u;

// Versionsnummer aus dem Wert eines Headers (If-Match, If-None-Match) oder undefined
export const parseVersion = (header: string | undefined) => {
    const version =
        header === undefined ? undefined : versionPattern.exec(header)?.groups?.['version'];
    return version === undefined ? undefined : Number(version);
};
