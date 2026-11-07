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

import { create, deleteById, update } from '../service/rezept-write.service.mts';
import { geaendertesRezeptSchema, neuesRezeptSchema } from './rezept-schema.mts';
import { Hono } from 'hono';
import { existsRezeptnummer } from '../service/rezept-read.service.mts';
import { z } from 'zod';

export const rezeptWriteRouter = new Hono();

// POST /rest
rezeptWriteRouter.post('/', async (c) => {
    // Bei ungueltigem JSON ist body undefined, und Zod meldet dann einen Fehler
    const body: unknown = await c.req.json().catch(() => undefined);
    const rezept = neuesRezeptSchema.safeParse(body);
    if (!rezept.success) {
        return c.json(
            { message: 'Ungueltige Rezeptdaten.', details: z.flattenError(rezept.error) },
            422,
        );
    }

    const { rezeptnummer } = rezept.data;
    if (await existsRezeptnummer(rezeptnummer)) {
        return c.json({ message: `Die Rezeptnummer ${rezeptnummer} existiert bereits.` }, 422);
    }

    const id = await create(rezept.data);
    return c.body(null, 201, { Location: `${new URL(c.req.url).origin}/rest/${id}` });
});

// If-Match: "<Versionsnummer>", z.B. "0" (ETag aus der Antwort auf GET /rest/:id)
const versionPattern = /^"(?<version>\d+)"$/u;

// PUT /rest/:id
rezeptWriteRouter.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
        return c.json({ message: 'Die ID muss eine ganze Zahl sein.' }, 404);
    }

    const ifMatch = c.req.header('If-Match');
    if (ifMatch === undefined) {
        return c.json({ message: 'Der Header If-Match mit der Version fehlt.' }, 428);
    }
    const versionText = versionPattern.exec(ifMatch)?.groups?.['version'];
    if (versionText === undefined) {
        return c.json({ message: 'Der Header If-Match muss die Form "0" haben.' }, 412);
    }

    const body: unknown = await c.req.json().catch(() => undefined);
    const rezept = geaendertesRezeptSchema.safeParse(body);
    if (!rezept.success) {
        return c.json(
            { message: 'Ungueltige Rezeptdaten.', details: z.flattenError(rezept.error) },
            422,
        );
    }

    const result = await update(id, Number(versionText), rezept.data);
    switch (result.status) {
        case 'not-found': {
            return c.json({ message: `Kein Rezept mit der ID ${id} gefunden.` }, 404);
        }
        case 'version-outdated': {
            return c.json({ message: 'Das Rezept wurde zwischenzeitlich geaendert.' }, 412);
        }
        default: {
            return c.body(null, 204, { ETag: `"${result.version}"` });
        }
    }
});

// DELETE /rest/:id, immer 204 (auch wenn es das Rezept nicht gibt)
rezeptWriteRouter.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (Number.isInteger(id)) {
        await deleteById(id);
    }
    return c.body(null, 204);
});
