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

import { rezeptTable, schwierigkeitsgrad, titelTable, zutatTable } from '../../db/schema.mts';
import { db } from '../../config/db.mts';

type Schwierigkeit = (typeof schwierigkeitsgrad.enumValues)[number];

type NeueZutat = Readonly<{
    bezeichnung: string;
    menge: number;
    einheit: string;
}>;

export type NeuesRezept = Readonly<{
    rezeptnummer: string;
    bewertung: number;
    schwierigkeit?: Schwierigkeit | undefined;
    kosten: number;
    zubereitungszeit: number;
    vegetarisch: boolean;
    datum?: string | undefined;
    quelle?: string | undefined;
    schlagwoerter?: readonly string[] | undefined;
    titel: Readonly<{ titel: string; untertitel?: string | undefined }>;
    zutaten: readonly NeueZutat[];
}>;

// Rezept, Titel und Zutaten in einer Transaktion anlegen: COMMIT bei Erfolg, sonst ROLLBACK
// Resultat: die generierte ID des neuen Rezepts
export const create = async ({ titel, zutaten, schlagwoerter, ...rezept }: NeuesRezept) =>
    await db.transaction(async (tx) => {
        const [rezeptInsert] = await tx
            .insert(rezeptTable)
            .values({
                ...rezept,
                // Kopie, weil Drizzle ein veraenderbares Array erwartet
                schlagwoerter: schlagwoerter === undefined ? undefined : [...schlagwoerter],
            })
            .returning({ id: rezeptTable.id });
        if (rezeptInsert === undefined) {
            throw new Error('Das Rezept wurde nicht eingefuegt.');
        }
        const rezeptId = rezeptInsert.id;

        await tx.insert(titelTable).values({ ...titel, rezeptId });
        const zutatenInsert = zutaten.map((zutat) => {
            return { ...zutat, rezeptId };
        });
        await tx.insert(zutatTable).values(zutatenInsert);
        return rezeptId;
    });
