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
import { port } from './config/server.mts';
import { rezeptGetRouter } from './rezept/rest/rezept-get.router.mts';
import { rezeptWriteRouter } from './rezept/rest/rezept-write.router.mts';
import { serve } from '@hono/node-server';

const app = new Hono();
app.route('/rest', rezeptGetRouter);
app.route('/rest', rezeptWriteRouter);

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Der Appserver laeuft auf http://localhost:${info.port}`);
});
