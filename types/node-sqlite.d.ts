/** Minimal ambient types for Node 22's built-in SQLite (node:sqlite). */
declare module "node:sqlite" {
  export type SQLValue = string | number | bigint | null | Uint8Array;

  export class StatementSync {
    all(...params: SQLValue[]): Record<string, any>[];
    get(...params: SQLValue[]): Record<string, any> | undefined;
    run(...params: SQLValue[]): { changes: number; lastInsertRowid: number | bigint };
    setReadBigInts(enabled: boolean): void;
    setAllowBareNamedParameters(enabled: boolean): void;
    sourceSQL: string;
  }

  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    open(): void;
    function(name: string, fn: (...args: any[]) => any): void;
  }
}
