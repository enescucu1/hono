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
    badRequest,
    createProblemDetails,
    notFound,
    preconditionFailed,
    preconditionRequired,
    unprocessableContent,
} from '../../problem-details.mts';
import { create, deleteById, update } from '../service/rezept-write.service.mts';
import { geaendertesRezeptSchema, neuesRezeptSchema } from './rezept-schema.mts';
import { invalidJson, readJson } from './read-json.mts';
import { Hono } from 'hono';
import { existsRezeptnummer } from '../service/rezept-read.service.mts';
import { parseVersion } from './etag.mts';
import { z } from 'zod';

export const rezeptWriteRouter = new Hono();

// POST /rest
rezeptWriteRouter.post('/', async (c) => {
    const body = await readJson(c);
    if (body === invalidJson) {
        return createProblemDetails(c, badRequest, 'Der Request-Body ist kein gueltiges JSON.');
    }
    const rezept = neuesRezeptSchema.safeParse(body);
    if (!rezept.success) {
        return createProblemDetails(c, unprocessableContent, z.flattenError(rezept.error));
    }

    const { rezeptnummer } = rezept.data;
    if (await existsRezeptnummer(rezeptnummer)) {
        return createProblemDetails(
            c,
            unprocessableContent,
            `Die Rezeptnummer ${rezeptnummer} existiert bereits.`,
        );
    }

    const id = await create(rezept.data);
    return c.body(null, 201, { Location: `${new URL(c.req.url).origin}/rest/${id}` });
});

// PUT /rest/:id
rezeptWriteRouter.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
        return createProblemDetails(c, notFound, 'Die ID muss eine ganze Zahl sein.');
    }

    const ifMatch = c.req.header('If-Match');
    if (ifMatch === undefined) {
        return createProblemDetails(
            c,
            preconditionRequired,
            'Der Header If-Match mit der Version fehlt.',
        );
    }
    // If-Match: "<Versionsnummer>", z.B. "0" (ETag aus der Antwort auf GET /rest/:id)
    const version = parseVersion(ifMatch);
    if (version === undefined) {
        return createProblemDetails(
            c,
            preconditionFailed,
            'Der Header If-Match muss die Form "0" haben.',
        );
    }

    const body = await readJson(c);
    if (body === invalidJson) {
        return createProblemDetails(c, badRequest, 'Der Request-Body ist kein gueltiges JSON.');
    }
    const rezept = geaendertesRezeptSchema.safeParse(body);
    if (!rezept.success) {
        return createProblemDetails(c, unprocessableContent, z.flattenError(rezept.error));
    }

    const result = await update(id, version, rezept.data);
    switch (result.status) {
        case 'not-found': {
            return createProblemDetails(c, notFound, `Kein Rezept mit der ID ${id} gefunden.`);
        }
        case 'version-outdated': {
            return createProblemDetails(
                c,
                preconditionFailed,
                'Das Rezept wurde zwischenzeitlich geaendert.',
            );
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
