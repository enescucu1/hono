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

import { rezeptTable, titelTable, zutatTable } from './schema.mts';
import { defineRelations } from 'drizzle-orm';

export const relations = defineRelations({ rezeptTable, titelTable, zutatTable }, (rel) => {
    return {
        titelTable: {
            rezeptTable: rel.one.rezeptTable({
                from: rel.titelTable.rezeptId,
                to: rel.rezeptTable.id,
            }),
        },
        rezeptTable: {
            titelTable: rel.one.titelTable(),
            zutatTable: rel.many.zutatTable(),
        },
        zutatTable: {
            rezeptTable: rel.one.rezeptTable({
                from: rel.zutatTable.rezeptId,
                to: rel.rezeptTable.id,
            }),
        },
    };
});
