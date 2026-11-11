-- Aufruf:
-- psql --dbname=rezept --username=rezept --file=/init/rezept/sql/drop-table.sql
-- Die Tabellen werden beim Neuladen der DB (/dev/db_populate) gelöscht und neu angelegt.

set search_path to 'rezept';

-- https://www.postgresql.org/docs/current/sql-droptable.html

DROP TABLE IF EXISTS zutat CASCADE;
DROP TABLE IF EXISTS titel CASCADE;
DROP TABLE IF EXISTS rezept CASCADE;

-- https://www.postgresql.org/docs/current/sql-droptype.html

DROP TYPE IF EXISTS schwierigkeitsgrad;
