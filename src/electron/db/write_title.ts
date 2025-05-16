import sqlite3 from 'sqlite3';
import { IWriteEntry } from 'db_connector'; 
/**
 * Fügt einen IWriteEntry in die Datenbank ein.
 * Erwartet eine geöffnete sqlite3.Database-Instanz.
 */
export async function insertWriteEntry(db: sqlite3.Database, entry: IWriteEntry): Promise<any> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Titel einfügen oder holen
      db.run(
        `INSERT OR IGNORE INTO titel (titel) VALUES (?)`,
        [entry.title],
        function (err) {
          if (err) return reject(err);

          // 2. Titel-ID holen
          db.get(
            `SELECT id FROM titel WHERE titel = ?`,
            [entry.title],
            function (err, row: any) {
              if (err || !row) return reject(err);
              const titelId = row.id;

              // 3. midi_file einfügen
              db.run(
                `INSERT INTO midi_file (length, text, jahr, signature) VALUES (?, ?, ?, ?)`,
                [entry.length?.toString() ?? null, entry.text ?? null, entry.jahr?.toString() ?? null, entry.signature],
                function (err) {
                  if (err) return reject(err);
                  const midiFileId = this.lastID;

                  // 4. midi_data einfügen
                  db.run(
                    `INSERT INTO midi_data (data) VALUES (?)`,
                    [entry.data],
                    function (err) {
                      if (err) return reject(err);
                      const midiDataId = this.lastID;

                      // 5. map_data anlegen
                      db.run(
                        `INSERT INTO map_data (midi_file, data) VALUES (?, ?)`,
                        [titelId, midiFileId],
                        function (err) {
                          if (err) return reject(err);

                          // 6. map_versions anlegen
                          db.run(
                            `INSERT INTO map_versions (version_data, midi_file) VALUES (?, ?)`,
                            [midiFileId, midiDataId],
                            function (err) {
                              if (err) return reject(err);

                              // 7. map_interpret, map_stil, map_genere (vereinfachtes Beispiel)
                              // Interpret
                              for (const interpret of entry.interpret) {
                                db.run(
                                  `INSERT OR IGNORE INTO interpret (name) VALUES (?)`,
                                  [interpret]
                                );
                                db.get(
                                  `SELECT id FROM interpret WHERE name = ?`,
                                  [interpret],
                                  function (err, row: any) {
                                    if (!err && row) {
                                      db.run(
                                        `INSERT INTO map_interpret (midi_file, interpret) VALUES (?, ?)`,
                                        [midiFileId, row.id]
                                      );
                                    }
                                  }
                                );
                              }
                              // Stil
                              for (const stil of entry.stil) {
                                db.run(
                                  `INSERT OR IGNORE INTO stil (name) VALUES (?)`,
                                  [stil]
                                );
                                db.get(
                                  `SELECT id FROM stil WHERE name = ?`,
                                  [stil],
                                  function (err, row: any) {
                                    if (!err && row) {
                                      db.run(
                                        `INSERT INTO map_stil (midi_file, stil) VALUES (?, ?)`,
                                        [midiFileId, row.id]
                                      );
                                    }
                                  }
                                );
                              }
                              // Genere
                              for (const genere of entry.genere) {
                                db.run(
                                  `INSERT OR IGNORE INTO genere (name) VALUES (?)`,
                                  [genere]
                                );
                                db.get(
                                  `SELECT id FROM genere WHERE name = ?`,
                                  [genere],
                                  function (err, row: any) {
                                    if (!err && row) {
                                      db.run(
                                        `INSERT INTO map_genere (midi_file, genere) VALUES (?, ?)`,
                                        [midiFileId, row.id]
                                      );
                                    }
                                  }
                                );
                              }

                              // Fertig!
                              resolve(midiFileId);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}