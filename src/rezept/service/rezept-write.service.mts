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

import { and, eq, sql } from 'drizzle-orm';
import { rezeptTable, schwierigkeitsgrad, titelTable, zutatTable } from '../../db/schema.mts';
import { db } from '../../config/db.mts';
import { sendNeuesRezeptMail } from '../../mail/mail.service.mts';

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
// Danach geht eine Mail an die Redaktion
// Resultat: die generierte ID des neuen Rezepts
export const create = async ({ titel, zutaten, schlagwoerter, ...rezept }: NeuesRezept) => {
    const id = await db.transaction(async (tx) => {
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

    // Die Mail erst nach dem COMMIT: bei einem Rollback gibt es keine Mail
    await sendNeuesRezeptMail({ id, rezeptnummer: rezept.rezeptnummer, titel: titel.titel });
    return id;
};

// Rezept ohne Rezeptnummer: alle Properties werden ersetzt
export type GeaendertesRezept = Omit<NeuesRezept, 'rezeptnummer'>;

export type UpdateResult =
    | Readonly<{ status: 'updated'; version: number }>
    | Readonly<{ status: 'not-found' }>
    | Readonly<{ status: 'version-outdated' }>;

// Rezept, Titel und Zutaten ersetzen (PUT). Optimistische Synchronisation: nur wenn die
// Versionsnummer in der DB mit "version" uebereinstimmt, wird geaendert und hochgezaehlt
export const update = async (
    id: number,
    version: number,
    { titel, zutaten, schlagwoerter, schwierigkeit, datum, quelle, ...rezept }: GeaendertesRezept,
): Promise<UpdateResult> =>
    await db.transaction(async (tx) => {
        const [updated] = await tx
            .update(rezeptTable)
            .set({
                ...rezept,
                // PUT ersetzt alles: nicht angegebene optionale Werte werden NULL
                schwierigkeit: schwierigkeit ?? null,
                datum: datum ?? null,
                quelle: quelle ?? null,
                schlagwoerter: schlagwoerter === undefined ? null : [...schlagwoerter],
                version: version + 1,
                aktualisiert: sql`now()`,
            })
            .where(and(eq(rezeptTable.id, id), eq(rezeptTable.version, version)))
            .returning({ version: rezeptTable.version });
        if (updated === undefined) {
            const vorhanden = await tx.query.rezeptTable.findFirst({
                columns: { id: true },
                where: { id },
            });
            return vorhanden === undefined
                ? { status: 'not-found' }
                : { status: 'version-outdated' };
        }

        await tx
            .update(titelTable)
            .set({ titel: titel.titel, untertitel: titel.untertitel ?? null })
            .where(eq(titelTable.rezeptId, id));
        await tx.delete(zutatTable).where(eq(zutatTable.rezeptId, id));
        const zutatenInsert = zutaten.map((zutat) => {
            return { ...zutat, rezeptId: id };
        });
        await tx.insert(zutatTable).values(zutatenInsert);
        return { status: 'updated', version: updated.version };
    });

// Loeschen mit der Rezept-ID. Titel und Zutaten werden durch ON DELETE CASCADE mitgeloescht
// Resultat: Anzahl der geloeschten Rezepte (0 oder 1)
export const deleteById = async (id: number) => {
    const geloescht = await db
        .delete(rezeptTable)
        .where(eq(rezeptTable.id, id))
        .returning({ id: rezeptTable.id });
    return geloescht.length;
};
