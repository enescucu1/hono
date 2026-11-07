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

import { find, findById } from '../service/rezept-read.service.mts';
import { Hono } from 'hono';
import { suchkriterienSchema } from './suchkriterien.mts';
import { z } from 'zod';

export const rezeptGetRouter = new Hono();

// GET /rest?titel=suppe&vegetarisch=true&seite=1&groesse=5
rezeptGetRouter.get('/', async (c) => {
    const kriterien = suchkriterienSchema.safeParse(c.req.query());
    if (!kriterien.success) {
        return c.json(
            { message: 'Ungueltige Suchkriterien.', details: z.flattenError(kriterien.error) },
            422,
        );
    }

    const rezepte = await find(kriterien.data);
    if (rezepte.length === 0) {
        return c.json({ message: 'Keine Rezepte gefunden.' }, 404);
    }
    return c.json(rezepte, 200);
});

// GET /rest/:id
rezeptGetRouter.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
        return c.json({ message: 'Die ID muss eine ganze Zahl sein.' }, 404);
    }

    const rezept = await findById(id);
    if (rezept === undefined) {
        return c.json({ message: `Kein Rezept mit der ID ${id} gefunden.` }, 404);
    }

    // ETag: Versionsnummer in Anfuehrungszeichen, z.B. "0"
    const etag = `"${rezept.version}"`;
    if (c.req.header('If-None-Match') === etag) {
        return c.body(null, 304);
    }
    return c.json(rezept, 200, { ETag: etag });
});
