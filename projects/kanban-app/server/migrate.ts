import db from './db';
import { ALL_TABLES, CREATE_INDEXES } from './schema';

export function runMigrations(): void {
  console.log('Running database migrations...');

  const transaction = db.transaction(() => {
    // Create tables
    for (const sql of ALL_TABLES) {
      db.exec(sql);
    }

    // Create indexes
    for (const sql of CREATE_INDEXES) {
      db.exec(sql);
    }

    // Ensure escrow columns exist on cards table
    const tableInfo = db.prepare("PRAGMA table_info('cards')").all() as Array<{ name: string }>;
    const existingCols = new Set(tableInfo.map(col => col.name));

    const extraCols: Array<[string, string]> = [
      ['bounty_algo', 'REAL DEFAULT 0'],
      ['creator_wallet', "TEXT DEFAULT ''"],
      ['assignee_wallet', "TEXT DEFAULT ''"],
      ['escrow_app_id', "TEXT DEFAULT ''"],
      ['deposit_tx_id', "TEXT DEFAULT ''"],
      ['release_tx_id', "TEXT DEFAULT ''"],
      ['refund_tx_id', "TEXT DEFAULT ''"],
    ];

    for (const [colName, colType] of extraCols) {
      if (!existingCols.has(colName)) {
        db.exec(`ALTER TABLE cards ADD COLUMN ${colName} ${colType};`);
      }
    }
  });

  transaction();
  console.log('Migrations complete.');
}
