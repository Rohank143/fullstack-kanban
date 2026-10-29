// Database schema definitions for the Kanban board

export const CREATE_BOARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export const CREATE_COLUMNS_TABLE = `
  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );
`;

export const CREATE_CARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'backlog',
    assignee TEXT DEFAULT '',
    due_date TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    tags TEXT DEFAULT '[]',
    bounty_algo REAL DEFAULT 0,
    creator_wallet TEXT DEFAULT '',
    assignee_wallet TEXT DEFAULT '',
    escrow_app_id TEXT DEFAULT '',
    deposit_tx_id TEXT DEFAULT '',
    release_tx_id TEXT DEFAULT '',
    refund_tx_id TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );
`;

export const CREATE_VIEWS_TABLE = `
  CREATE TABLE IF NOT EXISTS views (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    name TEXT NOT NULL,
    filters TEXT DEFAULT '{}',
    sort_by TEXT DEFAULT 'created_at',
    sort_order TEXT DEFAULT 'desc' CHECK(sort_order IN ('asc', 'desc')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );
`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);',
  'CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);',
  'CREATE INDEX IF NOT EXISTS idx_cards_board_id ON cards(board_id);',
  'CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);',
  'CREATE INDEX IF NOT EXISTS idx_cards_assignee ON cards(assignee);',
  'CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);',
  'CREATE INDEX IF NOT EXISTS idx_views_board_id ON views(board_id);',
];

export const ALL_TABLES = [
  CREATE_BOARDS_TABLE,
  CREATE_COLUMNS_TABLE,
  CREATE_CARDS_TABLE,
  CREATE_VIEWS_TABLE,
];
