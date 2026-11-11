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
import { populate } from './db-populate.mts';
import { rolesRequired } from '../../security/roles-required.mts';

/**
 * Router für die Entwicklung, z.B. Neuladen der DB. Er wird nur im Development-Modus eingebunden.
 * QUERY wie beim Dozenten, zusätzlich POST (Bruno).
 * Nur mit gültigem Token und der Rolle "admin".
 */
export const devRouter = new Hono();

devRouter.on(['QUERY', 'POST'], '/db_populate', rolesRequired('admin'), async (c) => {
    await populate();
    return c.json({ db_populate: 'ok' });
});
