
declare module 'db_connector' {

    export interface IWriteEntry {
        title: string;
        length?: number;
        text?: string;
        jahr?: Date;
        data: ArrayBuffer;
        signature: string;
        interpret: string[];
        stil: string[];
        genere: string[];
    }

    export interface IWriteResult {
        id: number;
    }
}