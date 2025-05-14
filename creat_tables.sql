PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "titlel" (
    "id" INTEGER NOT NULL,
    "titel" TEXT,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "midi_file" (
    "id" INTEGER NOT NULL,
    "interpret" INTEGER NOT NULL,
    "artists" INTEGER,
    "stil" INTEGER,
    "genere" INTEGER,
    "data" INTEGER NOT NULL,
    "length" TEXT,
    "nr_tracks" INTEGER,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("interpret") REFERENCES "interpret" ("id"),
    FOREIGN KEY ("stil") REFERENCES "stil" ("id"),
    FOREIGN KEY ("genere") REFERENCES "genere" ("id")
);

CREATE TABLE IF NOT EXISTS "interpret" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "geschichte" TEXT,
    PRIMARY KEY ("id", "name")
);

CREATE TABLE IF NOT EXISTS "genere" (
    "id" INTEGER NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stil" (
    "id" INTEGER NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "map_data" (
    "id" INTEGER NOT NULL,
    "midi_file" INTEGER NOT NULL,
    "data" INTEGER NOT NULL,
    PRIMARY KEY ("id", "midi_file", "data"),
    FOREIGN KEY ("data") REFERENCES "midi_file" ("id"),
    FOREIGN KEY ("midi_file") REFERENCES "titlel" ("id")
);

CREATE TABLE IF NOT EXISTS "midi_data" (
    "id" INTEGER NOT NULL,
    "data" BLOB,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "map_versions" (
    "id" INTEGER NOT NULL,
    "midi_file" INTEGER,
    "version_data" INTEGER,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("midi_file") REFERENCES "midi_file" ("data"),
    FOREIGN KEY ("version_data") REFERENCES "midi_data" ("id")
);