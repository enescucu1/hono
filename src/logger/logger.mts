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
 * Das Modul besteht aus der Funktion {@linkcode getLogger} für einen Logger auf
 * der Basis von Pino: https://getpino.io. Die Ausgabe geht in eine Log-Datei und
 * optional lesbar in die Konsole.
 * @packageDocumentation
 */

import { type PrettyOptions } from 'pino-pretty';
import { getConfig } from '../config/config.mts';
import { pino } from 'pino';
import { resolve } from 'node:path';

const config = await getConfig();
const { dir, file, level, pretty } = config.log;
const logFile = resolve(dir, file);

// Log-Levels: fatal, error, warn, info, debug, trace
// mkdir: das Verzeichnis fuer die Log-Datei wird bei Bedarf angelegt
const fileOptions = {
    level,
    target: 'pino/file',
    options: { destination: logFile, mkdir: true },
};
const prettyOptions: PrettyOptions = {
    translateTime: 'SYS:standard',
    singleLine: true,
    colorize: true,
    ignore: 'pid,hostname',
};
const prettyTransportOptions = {
    level,
    target: 'pino-pretty',
    options: prettyOptions,
};

const options: pino.TransportMultiOptions | pino.TransportSingleOptions = pretty
    ? { targets: [fileOptions, prettyTransportOptions] }
    : { targets: [fileOptions] };
const transports = pino.transport(options);

// https://github.com/pinojs/pino/issues/1160#issuecomment-944081187
const parentLogger: pino.Logger<string> = pino({ level }, transports);

/**
 * Eine Funktion, um ein Logger-Objekt von `Pino` zu erzeugen, so dass ein
 * _Kontext_ definiert wird, der bei jeder Log-Methode verwendet wird und z.B.
 * der Name einer Datei oder einer Funktion ist.
 * @param context Der Kontext
 * @param kind i.a. `func` oder `file`
 */
export const getLogger: (context: string, kind?: string) => pino.Logger<string> = (
    context: string,
    kind = 'file',
) => {
    const bindings: Record<string, string> = {};
    bindings[kind] = context;
    // https://getpino.io/#/docs/child-loggers
    return parentLogger.child(bindings);
};
