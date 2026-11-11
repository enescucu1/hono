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

// Schema-first: das GraphQL-Schema als Text, die Resolver stehen in rezept-resolvers.mts
export const typeDefs = /* GraphQL */ `
    enum Schwierigkeit {
        EINFACH
        MITTEL
        SCHWER
    }

    type Titel {
        titel: String!
        untertitel: String
    }

    type Zutat {
        bezeichnung: String!
        menge: Float!
        einheit: String!
    }

    type Rezept {
        id: Int!
        version: Int!
        rezeptnummer: String!
        bewertung: Int!
        schwierigkeit: Schwierigkeit
        kosten: Float!
        zubereitungszeit: Int!
        vegetarisch: Boolean!
        datum: String
        quelle: String
        schlagwoerter: [String!]
        titel: Titel!
        zutaten: [Zutat!]!
    }

    input Suchkriterien {
        titel: String
        schwierigkeit: Schwierigkeit
        vegetarisch: Boolean
        seite: Int = 1
        groesse: Int = 5
    }

    input TitelInput {
        titel: String!
        untertitel: String
    }

    input ZutatInput {
        bezeichnung: String!
        menge: Float!
        einheit: String!
    }

    input RezeptInput {
        rezeptnummer: String!
        bewertung: Int!
        schwierigkeit: Schwierigkeit
        kosten: Float!
        zubereitungszeit: Int!
        vegetarisch: Boolean
        datum: String
        quelle: String
        schlagwoerter: [String!]
        titel: TitelInput!
        zutaten: [ZutatInput!]!
    }

    type CreatePayload {
        id: Int!
    }

    type Query {
        # Ein Rezept mit der ID oder null
        rezept(id: Int!): Rezept
        # Rezepte nach Suchkriterien, ggf. leer
        rezepte(suchkriterien: Suchkriterien): [Rezept!]!
    }

    # Antwort von Keycloak, die Namen stehen im JSON von Keycloak so (mit Unterstrich)
    type TokenPayload {
        access_token: String!
        expires_in: Int!
        refresh_token: String!
        refresh_expires_in: Int!
    }

    type Mutation {
        # nur mit Token und der Rolle "admin" oder "user"
        create(input: RezeptInput!): CreatePayload!
        # Access Token von Keycloak holen
        token(username: String!, password: String!): TokenPayload
    }
`;
