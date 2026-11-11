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

import { type Rolle, pruefeToken } from '../../security/token-pruefen.mts';
import {
    existsRezeptnummer,
    find,
    findById,
    findZutaten,
} from '../service/rezept-read.service.mts';
import { GraphQLError } from 'graphql';
import { create } from '../service/rezept-write.service.mts';
import { neuesRezeptSchema } from '../rest/rezept-schema.mts';
import { schwierigkeitsgrad } from '../../db/schema.mts';
import { token } from '../../security/keycloak-service.mts';
import { unauthorized } from '../../problem-details.mts';
import { z } from 'zod';

const standardGroesse = 5;
const maxGroesse = 20;

// Argument "suchkriterien" bei der Query "rezepte"
const suchkriterienSchema = z.strictObject({
    titel: z.string().min(1).optional(),
    schwierigkeit: z.enum(schwierigkeitsgrad.enumValues).optional(),
    vegetarisch: z.boolean().optional(),
    seite: z.number().int().min(1).default(1),
    groesse: z.number().int().min(1).max(maxGroesse).default(standardGroesse),
});

// Bei GraphQL kann ein Client fuer optionale Felder explizit null senden, Zod erwartet dann aber
// "fehlt". Deshalb werden null-Werte vor der Validierung entfernt.
const ohneNull = (wert: unknown): unknown => {
    if (Array.isArray(wert)) {
        return wert.map(ohneNull);
    }
    if (typeof wert === 'object' && wert !== null) {
        return Object.fromEntries(
            Object.entries(wert)
                .filter(([, eintrag]) => eintrag !== null)
                .map(([schluessel, eintrag]) => [schluessel, ohneNull(eintrag)]),
        );
    }
    return wert;
};

const badUserInput = (message: string, details?: unknown) =>
    new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', details } });

// Bei GraphQL ist der HTTP-Status immer 200, Fehler stehen in "errors" mit einem Code
const graphqlFehler = (message: string, code: string) =>
    new GraphQLError(message, { extensions: { code } });

// Request ist der Fetch-Request aus dem Kontext von Yoga
type GraphqlContext = Readonly<{ request: Request }>;

// Token und Rolle pruefen: UNAUTHENTICATED (kein gueltiger Token) oder FORBIDDEN (Rolle fehlt)
const rolesRequired = async ({ request }: GraphqlContext, ...rollen: readonly Rolle[]) => {
    const pruefung = await pruefeToken(request.headers.get('Authorization'), ...rollen);
    if (!pruefung.ok) {
        const code = pruefung.status === unauthorized ? 'UNAUTHENTICATED' : 'FORBIDDEN';
        throw graphqlFehler(pruefung.detail, code);
    }
};

type RezeptParent = Readonly<{ id: number }>;

export const resolvers = {
    Query: {
        // Resultat null, wenn es die ID nicht gibt
        rezept: async (_parent: unknown, { id }: Readonly<{ id: number }>) =>
            (await findById(id)) ?? null,

        rezepte: async (_parent: unknown, args: Readonly<{ suchkriterien?: unknown }>) => {
            const kriterien = suchkriterienSchema.safeParse(ohneNull(args.suchkriterien ?? {}));
            if (!kriterien.success) {
                throw badUserInput('Ungueltige Suchkriterien.', z.flattenError(kriterien.error));
            }
            return await find(kriterien.data);
        },
    },

    // Beim Suchen mit "rezepte" sind die Zutaten nicht geladen: dann werden sie hier nachgeladen
    Rezept: {
        zutaten: async (rezept: RezeptParent & Readonly<{ zutaten?: unknown }>) =>
            rezept.zutaten ?? (await findZutaten(rezept.id)),
    },

    Mutation: {
        create: async (
            _parent: unknown,
            args: Readonly<{ input: unknown }>,
            context: GraphqlContext,
        ) => {
            // zuerst die Berechtigung, dann erst die Eingabe
            await rolesRequired(context, 'admin', 'user');

            const rezept = neuesRezeptSchema.safeParse(ohneNull(args.input));
            if (!rezept.success) {
                throw badUserInput('Ungueltige Rezeptdaten.', z.flattenError(rezept.error));
            }

            const { rezeptnummer } = rezept.data;
            if (await existsRezeptnummer(rezeptnummer)) {
                throw badUserInput(`Die Rezeptnummer ${rezeptnummer} existiert bereits.`);
            }

            return { id: await create(rezept.data) };
        },

        token: async (
            _parent: unknown,
            { username, password }: Readonly<{ username: string; password: string }>,
        ) => {
            const result = await token(username, password);
            switch (result.status) {
                case 'ungueltig': {
                    throw graphqlFehler(
                        'Benutzername oder Passwort sind falsch.',
                        'UNAUTHENTICATED',
                    );
                }
                case 'nicht-erreichbar': {
                    throw graphqlFehler('Keycloak ist nicht erreichbar.', 'SERVICE_UNAVAILABLE');
                }
                default: {
                    return result.token;
                }
            }
        },
    },
};
