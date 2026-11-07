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

import { db } from '../../config/db.mts';
import { schwierigkeitsgrad } from '../../db/schema.mts';

type Schwierigkeit = (typeof schwierigkeitsgrad.enumValues)[number];

export type Suchkriterien = Readonly<{
    titel?: string | undefined;
    schwierigkeit?: Schwierigkeit | undefined;
    vegetarisch?: boolean | undefined;
    // Seitennummer ab 1
    seite: number;
    // Anzahl der Rezepte pro Seite
    groesse: number;
}>;

// Suche mit der Rezept-ID, einschliesslich Titel (1:1) und Zutaten (1:n)
// Resultat: das gefundene Rezept oder undefined
export const findById = async (id: number) =>
    await db.query.rezeptTable.findFirst({
        where: { id },
        with: { titel: true, zutaten: true },
    });

// Suche mit Suchkriterien und Pagination, jeweils mit dem Titel (1:1)
// Nur vorhandene Kriterien kommen in den Filter, weil Drizzle bei "exactOptionalPropertyTypes" kein undefined akzeptiert
// Resultat: Array der gefundenen Rezepte, ggf. leer
export const find = async ({ titel, schwierigkeit, vegetarisch, seite, groesse }: Suchkriterien) =>
    await db.query.rezeptTable.findMany({
        where: {
            ...(schwierigkeit === undefined ? {} : { schwierigkeit }),
            ...(vegetarisch === undefined ? {} : { vegetarisch }),
            ...(titel === undefined ? {} : { titel: { titel: { ilike: `%${titel}%` } } }),
        },
        with: { titel: true },
        orderBy: { id: 'asc' },
        limit: groesse,
        offset: (seite - 1) * groesse,
    });
