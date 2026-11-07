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
    boolean,
    check,
    date,
    foreignKey,
    index,
    integer,
    jsonb,
    numeric,
    pgSchema,
    text,
    timestamp,
    unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Erzeugt mit "pnpm exec drizzle-kit pull" und anschliessend angepasst:
// Variablen fuer Schema und Tabellen umbenannt, numeric als number, .defaultNow()

export const rezeptSchema = pgSchema('rezept');
export const schwierigkeitsgrad = rezeptSchema.enum('schwierigkeitsgrad', [
    'EINFACH',
    'MITTEL',
    'SCHWER',
]);

export const rezeptTable = rezeptSchema.table(
    'rezept',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
        version: integer().default(0).notNull(),
        rezeptnummer: text().notNull(),
        bewertung: integer().notNull(),
        schwierigkeit: schwierigkeitsgrad(),
        kosten: numeric({ precision: 8, scale: 2, mode: 'number' }).notNull(),
        zubereitungszeit: integer().notNull(),
        vegetarisch: boolean().default(false).notNull(),
        datum: date(),
        quelle: text(),
        schlagwoerter: jsonb().$type<string[]>(),
        erzeugt: timestamp().defaultNow().notNull(),
        aktualisiert: timestamp().defaultNow().notNull(),
    },
    (table) => [
        unique('rezept_rezeptnummer_key').on(table.rezeptnummer),
        check('rezept_bewertung_check', sql`((bewertung >= 0) AND (bewertung <= 5))`),
        check('rezept_zubereitungszeit_check', sql`(zubereitungszeit > 0)`),
    ],
);

export const titelTable = rezeptSchema.table(
    'titel',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
        titel: text().notNull(),
        untertitel: text(),
        rezeptId: integer('rezept_id').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.rezeptId],
            foreignColumns: [rezeptTable.id],
            name: 'titel_rezept_id_fkey',
        }).onDelete('cascade'),
        unique('titel_rezept_id_key').on(table.rezeptId),
    ],
);

export const zutatTable = rezeptSchema.table(
    'zutat',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
        bezeichnung: text().notNull(),
        menge: numeric({ precision: 8, scale: 2, mode: 'number' }).notNull(),
        einheit: text().notNull(),
        rezeptId: integer('rezept_id').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.rezeptId],
            foreignColumns: [rezeptTable.id],
            name: 'zutat_rezept_id_fkey',
        }).onDelete('cascade'),
        index('zutat_rezept_id_idx').using('btree', table.rezeptId.asc().nullsLast()),
        check('zutat_menge_check', sql`(menge > (0)::numeric)`),
    ],
);
