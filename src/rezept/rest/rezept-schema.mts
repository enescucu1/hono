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

import { schwierigkeitsgrad } from '../../db/schema.mts';
import { z } from 'zod';

const maxBewertung = 5;
const maxKosten = 999_999.99;

// Body bei POST /rest: Rezept mit Titel (1:1) und Zutaten (1:n)
// strictObject: unbekannte Properties (z.B. Tippfehler) werden abgelehnt
export const neuesRezeptSchema = z.strictObject({
    rezeptnummer: z
        .string()
        .regex(/^RZ-\d{3,6}$/u, 'Die Rezeptnummer muss das Format RZ-123 haben.'),
    bewertung: z.number().int().min(0).max(maxBewertung),
    schwierigkeit: z.enum(schwierigkeitsgrad.enumValues).optional(),
    kosten: z.number().min(0).max(maxKosten),
    // Minuten
    zubereitungszeit: z.number().int().min(1),
    vegetarisch: z.boolean().default(false),
    datum: z.iso.date().optional(),
    quelle: z.url().optional(),
    schlagwoerter: z.array(z.string().min(1)).optional(),
    titel: z.strictObject({
        titel: z.string().min(1),
        untertitel: z.string().min(1).optional(),
    }),
    zutaten: z
        .array(
            z.strictObject({
                bezeichnung: z.string().min(1),
                menge: z.number().positive(),
                einheit: z.string().min(1),
            }),
        )
        .min(1),
});
