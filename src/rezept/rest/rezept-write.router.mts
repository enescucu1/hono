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

import { Hono } from 'hono';
import { create } from '../service/rezept-write.service.mts';
import { existsRezeptnummer } from '../service/rezept-read.service.mts';
import { neuesRezeptSchema } from './rezept-schema.mts';
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
