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

const standardGroesse = 5;
const maxGroesse = 20;

// Query-Parameter bei GET /rest, z.B. ?titel=suppe&vegetarisch=true&seite=1&groesse=5
// strictObject: unbekannte Parameter (z.B. Tippfehler) werden abgelehnt
export const suchkriterienSchema = z.strictObject({
    titel: z.string().min(1).optional(),
    schwierigkeit: z.enum(schwierigkeitsgrad.enumValues).optional(),
    vegetarisch: z.stringbool().optional(),
    seite: z.coerce.number().int().min(1).default(1),
    groesse: z.coerce.number().int().min(1).max(maxGroesse).default(standardGroesse),
});
