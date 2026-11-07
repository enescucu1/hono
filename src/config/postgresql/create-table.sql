-- Copyright (C) 2022 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- Aufruf:   psql --dbname=rezept --username=rezept --file=/init/rezept/sql/create-table.sql

-- https://www.postgresql.org/docs/current/manage-ag-tablespaces.html
SET default_tablespace = rezeptspace;

-- https://www.postgresql.org/docs/current/ddl-schemas.html
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION rezept;

ALTER ROLE rezept SET search_path = 'rezept';
set search_path to 'rezept';

-- https://www.postgresql.org/docs/current/datatype-enum.html
CREATE TYPE schwierigkeitsgrad AS ENUM ('EINFACH', 'MITTEL', 'SCHWER');

CREATE TABLE IF NOT EXISTS rezept (
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS
                  -- impliziter Index fuer Primary Key
                  -- "GENERATED ALWAYS AS IDENTITY" gemaess SQL-Standard
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#id-1.5.4.6.6
    version       integer NOT NULL DEFAULT 0,
                  -- impliziter Index als B-Baum durch UNIQUE
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
    rezeptnummer  text NOT NULL UNIQUE,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
    bewertung     integer NOT NULL CHECK (bewertung >= 0 AND bewertung <= 5),
    schwierigkeit schwierigkeitsgrad,
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL
                  -- 8 Stellen, davon 2 Nachkommastellen
    kosten        decimal(8,2) NOT NULL,
                  -- Zubereitungszeit in Minuten
    zubereitungszeit integer NOT NULL CHECK (zubereitungszeit > 0),
                  -- https://www.postgresql.org/docs/current/datatype-boolean.html
    vegetarisch   boolean NOT NULL DEFAULT FALSE,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    datum         date,
    quelle        text,
                  -- https://www.postgresql.org/docs/current/datatype-json.html
    schlagwoerter jsonb,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
);

-- 1:1 zu rezept (UNIQUE bei rezept_id)
CREATE TABLE IF NOT EXISTS titel (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    titel       text NOT NULL,
    untertitel  text,
                -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
    rezept_id   integer NOT NULL UNIQUE REFERENCES rezept ON DELETE CASCADE
);

-- 1:n zu rezept
CREATE TABLE IF NOT EXISTS zutat (
    id           integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    bezeichnung  text NOT NULL,
    menge        decimal(8,2) NOT NULL CHECK (menge > 0),
    einheit      text NOT NULL,
    rezept_id    integer NOT NULL REFERENCES rezept ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS zutat_rezept_id_idx ON zutat(rezept_id);
