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
 * Das Modul enthält die Konfigurationsdaten aus "config.toml". Sie werden mit _c12_ geladen
 * und mit einem Zod-Schema geprüft. Fehlende Werte erhalten Standardwerte.
 * @packageDocumentation
 */

import { URL, fileURLToPath } from 'node:url';
import { loadConfig } from 'c12';
import process from 'node:process';
import { z } from 'zod';

// "import.meta" nur bei ESM: in package.json "type": "module" und die Dateiendung .mts
// config.toml und das Verzeichnis tls liegen im selben Verzeichnis wie diese Datei
export const configURL = new URL(import.meta.url);
const tlsURL = new URL('tls/', configURL);

const nodeEnvs = ['production', 'test', 'development'] as const;
const nodeEnvEnv = process.env['NODE_ENV'];
const nodeEnvDefault = nodeEnvs.find((nodeEnv) => nodeEnv === nodeEnvEnv) ?? 'production';

// https://getpino.io
const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
const logLevelEnv = process.env['LOG_LEVEL'];
const logLevelDefault = logLevels.find((level) => level === logLevelEnv) ?? 'info';

const maxPort = 65_535;
const standardPort = 3000;
const smtpPort = 1025;

// Zod-Schema fuer config.toml
const ConfigSchema = z.object({
    server: z.object({
        host: z.string().default('localhost'),
        port: z.number().int().min(1).max(maxPort).default(standardPort),
        keyFile: z.string().default(fileURLToPath(new URL('key.pem', tlsURL))),
        certFile: z.string().default(fileURLToPath(new URL('certificate.crt', tlsURL))),
        allowHTTP1: z.boolean().default(false),
        nodeEnv: z.enum(nodeEnvs).default(nodeEnvDefault),
    }),

    db: z.object({
        user: z.string().default('rezept'),
        // Administrator, z.B. fuer COPY beim Neuladen der DB
        admin: z.string().default('postgres'),
        database: z.string().default('rezept'),
        password: z.string(),
        adminPassword: z.string().optional(),
        host: z.string().default('localhost'),
        cert: z.string().endsWith('.crt').default('config/postgresql/server.crt'),
        tlsMinVersion: z.enum(['TLSv1.3', 'TLSv1.2']).default('TLSv1.3'),
        tlsMaxVersion: z.enum(['TLSv1.3', 'TLSv1.2']).default('TLSv1.3'),
        // Connection Pool
        // oxlint-disable no-magic-numbers
        poolMax: z.number().int().min(1).max(100).default(10),
        poolIdleTimeoutMillis: z.number().int().min(1000).max(60_000).default(30_000),
        poolConnectionTimeoutMillis: z.number().int().min(1000).default(5000),
        // oxlint-enable no-magic-numbers
        // /dev/db_populate: DB neu laden (nur in der Entwicklung)
        populate: z.boolean().default(false),
    }),

    mail: z.object({
        enabled: z.boolean().default(true),
        host: z.string().default('localhost'),
        port: z.number().int().min(1).max(maxPort).default(smtpPort),
        from: z.string().default('Rezept Server <rezept@acme.com>'),
        to: z.string().default('Redaktion <redaktion@acme.com>'),
    }),

    log: z.object({
        dir: z.string().default('./log'),
        file: z.string().default('server.log'),
        level: z.enum(logLevels).default(logLevelDefault),
        pretty: z.boolean().default(false),
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Konfigurationsdaten aus "config.toml" durch "c12"
export const getConfig = async (): Promise<Config> => {
    const { config } = await loadConfig<Config>({
        name: 'config',
        configFile: fileURLToPath(new URL('config.toml', configURL)),
        configFileRequired: true,
        dotenv: true,
        schema: ConfigSchema,
    });

    return config;
};
