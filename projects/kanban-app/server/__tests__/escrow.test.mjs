import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Test database setup
const db = new Database(':memory:');

db.exec(`
  CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );

  CREATE TABLE cards (
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
`);

test('Database Schema & Card Escrow Fields Initialization', () => {
  const boardId = uuidv4();
  const colTodo = uuidv4();
  const colDone = uuidv4();
  const cardId = uuidv4();

  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(boardId, 'Bounty Board');
  db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(colTodo, boardId, 'To Do', 0);
  db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(colDone, boardId, 'Done', 1);

  db.prepare(`
    INSERT INTO cards (
      id, column_id, board_id, title, description, bounty_algo, creator_wallet, escrow_app_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cardId,
    colTodo,
    boardId,
    'Implement Token Bridge',
    'Task with 10 ALGO bounty',
    10.5,
    'CREATOR_ADDR_123',
    'APP_ESCROW_998877'
  );

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  assert.strictEqual(card.title, 'Implement Token Bridge');
  assert.strictEqual(card.bounty_algo, 10.5);
  assert.strictEqual(card.creator_wallet, 'CREATOR_ADDR_123');
  assert.strictEqual(card.escrow_app_id, 'APP_ESCROW_998877');
  assert.strictEqual(card.release_tx_id, '');
  assert.strictEqual(card.refund_tx_id, '');
});

test('Escrow Deposit and Assignee Claim Updates', () => {
  const boardId = uuidv4();
  const colId = uuidv4();
  const cardId = uuidv4();

  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(boardId, 'Dev Board');
  db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(colId, boardId, 'In Progress', 0);
  db.prepare('INSERT INTO cards (id, column_id, board_id, title) VALUES (?, ?, ?, ?)').run(cardId, colId, boardId, 'NFT Minting');

  // Record Deposit
  db.prepare(`
    UPDATE cards SET 
      escrow_app_id = ?,
      creator_wallet = ?,
      bounty_algo = ?,
      deposit_tx_id = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run('APP_774921', 'CREATOR_WALLET_XYZ', 25, 'DEP_TX_ALGO_112233', cardId);

  let card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  assert.strictEqual(card.escrow_app_id, 'APP_774921');
  assert.strictEqual(card.bounty_algo, 25);
  assert.strictEqual(card.deposit_tx_id, 'DEP_TX_ALGO_112233');

  // Record Claim
  db.prepare("UPDATE cards SET assignee_wallet = ?, updated_at = datetime('now') WHERE id = ?")
    .run('ASSIGNEE_WALLET_ABC', cardId);

  card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  assert.strictEqual(card.assignee_wallet, 'ASSIGNEE_WALLET_ABC');
});

test('Escrow Completion Release Approval & Status Update to Done', () => {
  const boardId = uuidv4();
  const colId = uuidv4();
  const cardId = uuidv4();

  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(boardId, 'Board A');
  db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(colId, boardId, 'To Do', 0);
  db.prepare(`
    INSERT INTO cards (id, column_id, board_id, title, bounty_algo, escrow_app_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cardId, colId, boardId, 'Smart Contract Audit', 50, 'APP_AUDIT_443');

  // Creator approves release when moved to Done
  const releaseTxId = 'REL_TX_ALGO_SUCCESS_556677';
  db.prepare("UPDATE cards SET release_tx_id = ?, status = 'done', updated_at = datetime('now') WHERE id = ?")
    .run(releaseTxId, cardId);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  assert.strictEqual(card.status, 'done');
  assert.strictEqual(card.release_tx_id, releaseTxId);
  assert.strictEqual(card.refund_tx_id, '');
});

test('Escrow Cancellation & Refund Update to Cancelled', () => {
  const boardId = uuidv4();
  const colId = uuidv4();
  const cardId = uuidv4();

  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(boardId, 'Board B');
  db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(colId, boardId, 'To Do', 0);
  db.prepare(`
    INSERT INTO cards (id, column_id, board_id, title, bounty_algo, escrow_app_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cardId, colId, boardId, 'Abandoned Research Task', 15, 'APP_ABANDON_991');

  // Creator cancels task and triggers refund
  const refundTxId = 'REF_TX_ALGO_CONFIRMED_889900';
  db.prepare("UPDATE cards SET refund_tx_id = ?, status = 'cancelled', updated_at = datetime('now') WHERE id = ?")
    .run(refundTxId, cardId);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  assert.strictEqual(card.status, 'cancelled');
  assert.strictEqual(card.refund_tx_id, refundTxId);
  assert.strictEqual(card.release_tx_id, '');
});
