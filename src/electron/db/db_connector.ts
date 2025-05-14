/**
 * connects to the databas
 */
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, "../..", "database.db");

const sqlFilePath = path.join(__dirname, "../..", "creat_tables.sql");
//const sqlInitScript = require("creat_tables.sql");


class Database {
    private db: any;
    private initialized: boolean = false;
    private task_is_running: boolean = false;

    constructor() {
        this.task_is_running = true;
        this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX, (message: any) => {
            if (message) {
                console.error('Error opening database ' + message);
            } else {
                console.log('Connected to the database.');
            }
        });
    }

    async initializeTables(): Promise<boolean> {
        try {
            // Read the SQL file using a Promise-based approach
            const sqlInitScript = await fs.promises.readFile(sqlFilePath, 'utf8');

            // Execute the SQL commands
            return new Promise((resolve, reject) => {
                this.db.exec(sqlInitScript, (execErr: any) => {
                    if (execErr) {
                        console.error('Error executing SQL commands: ' + execErr.message);
                        reject(false);
                    } else {
                        console.log('Tables initialized successfully.');
                        this.initialized = true;
                        resolve(true);
                    }
                });
            });
        } catch (err) {
            console.error('Error reading SQL file: ' + err.message);
            return false;
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }


    close() {
        this.db.close((err: any) => {
            if (err) {
                console.error('Error closing database ' + err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
}

export default Database;



