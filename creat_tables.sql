PRAGMA foreign_keys = ON;

CREATE TABLE "midi_file" (
    "id" INTEGER PRIMARY KEY,
    "length" TEXT,
    "nr_tracks" INTEGER,
    "text" TEXT,
    "tempo" INTEGER,
    "signature" INTEGER,
    "jahr" TEXT,
    "validated" INTEGER,
    FOREIGN KEY ("signature") REFERENCES "signatures"("signature")
);

CREATE TABLE "midi_data" (
    "id" INTEGER PRIMARY KEY,
    "data" BLOB
);

CREATE TABLE "titel" (
    "id" INTEGER PRIMARY KEY,
    "titel" TEXT
);

CREATE TABLE "stil" (
    "id" INTEGER PRIMARY KEY,
    "name" TEXT
);

CREATE TABLE "genere" (
    "id" INTEGER PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE TABLE "interpret" (
    "id" INTEGER PRIMARY KEY,
    "name" TEXT NOT NULL,
    "geschichte" TEXT
);

CREATE TABLE "signatures" (
    "signature" TEXT PRIMARY KEY
);

CREATE TABLE "map_data" (
    "midi_file" INTEGER NOT NULL,
    "data" INTEGER NOT NULL,
    PRIMARY KEY ("midi_file", "data"),
    FOREIGN KEY ("data") REFERENCES "midi_file"("id"),
    FOREIGN KEY ("midi_file") REFERENCES "titel"("id")
);

CREATE TABLE "map_versions" (
    "version_data" INTEGER NOT NULL,
    "midi_file" INTEGER NOT NULL,
    PRIMARY KEY ("version_data", "midi_file"),
    FOREIGN KEY ("version_data") REFERENCES "midi_file"("id"),
    FOREIGN KEY ("midi_file") REFERENCES "midi_data"("id")
);

CREATE TABLE "map_interpret" (
    "midi_file" INTEGER NOT NULL,
    "interpret" INTEGER NOT NULL,
    PRIMARY KEY ("midi_file", "interpret"),
    FOREIGN KEY ("midi_file") REFERENCES "midi_file"("id"),
    FOREIGN KEY ("interpret") REFERENCES "interpret"("id")
);

CREATE TABLE "map_genere" (
    "midi_file" INTEGER NOT NULL,
    "genere" INTEGER NOT NULL,
    PRIMARY KEY ("midi_file", "genere"),
    FOREIGN KEY ("genere") REFERENCES "genere"("id"),
    FOREIGN KEY ("midi_file") REFERENCES "midi_file"("id")
);

CREATE TABLE "map_stil" (
    "midi_file" INTEGER NOT NULL,
    "stil" INTEGER NOT NULL,
    PRIMARY KEY ("midi_file", "stil"),
    FOREIGN KEY ("stil") REFERENCES "stil"("id"),
    FOREIGN KEY ("midi_file") REFERENCES "midi_file"("id")
);

