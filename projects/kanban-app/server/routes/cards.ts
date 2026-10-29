import { Router } from 'express';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/cards?column_id=X&board_id=X — list cards
router.get('/', (req, res) => {
  const { column_id, board_id } = req.query;
  let cards;
  if (column_id) {
    cards = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position').all(column_id);
  } else if (board_id) {
    cards = db.prepare('SELECT * FROM cards WHERE board_id = ? ORDER BY position').all(board_id);
  } else {
    cards = db.prepare('SELECT * FROM cards ORDER BY created_at DESC').all();
  }
  res.json(cards);
});

// POST /api/cards — create card
router.post('/', (req, res) => {
  const {
    column_id,
    board_id,
    title,
    description = '',
    priority = 'medium',
    bounty_algo = 0,
    creator_wallet = '',
    assignee_wallet = '',
    escrow_app_id = '',
  } = req.body;

  if (!column_id || !board_id || !title) {
    return res.status(400).json({ error: 'column_id, board_id, and title are required' });
  }

  const maxPos = db.prepare('SELECT MAX(position) as max FROM cards WHERE column_id = ?').get(column_id) as any;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO cards (
      id, column_id, board_id, title, description, position, priority,
      bounty_algo, creator_wallet, assignee_wallet, escrow_app_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    column_id,
    board_id,
    title,
    description,
    (maxPos?.max ?? -1) + 1,
    priority,
    bounty_algo,
    creator_wallet,
    assignee_wallet,
    escrow_app_id
  );

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  res.status(201).json(card);
});

// PATCH /api/cards/:cardId — update card
router.patch('/:cardId', (req, res) => {
  const {
    title,
    description,
    column_id,
    position,
    priority,
    status,
    assignee,
    due_date,
    tags,
    bounty_algo,
    creator_wallet,
    assignee_wallet,
    escrow_app_id,
    deposit_tx_id,
    release_tx_id,
    refund_tx_id,
  } = req.body;

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  // Handle move to different column
  if (column_id !== undefined && (card as any).column_id !== column_id) {
    // Reorder old column
    db.prepare("UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?")
      .run((card as any).column_id, (card as any).position);
    // Get new position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM cards WHERE column_id = ?').get(column_id) as any;
    const newPos = position ?? (maxPos?.max ?? -1) + 1;
    db.prepare("UPDATE cards SET column_id = ?, position = ?, board_id = COALESCE(?, board_id), updated_at = datetime('now') WHERE id = ?")
      .run(column_id, newPos, req.body.board_id ?? null, req.params.cardId);
  } else if (position !== undefined && position !== (card as any).position) {
    // Reorder within same column
    const oldPos = (card as any).position;
    if (position > oldPos) {
      db.prepare("UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?")
        .run((card as any).column_id, oldPos, position);
    } else {
      db.prepare("UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?")
        .run((card as any).column_id, position, oldPos);
    }
    db.prepare("UPDATE cards SET position = ?, updated_at = datetime('now') WHERE id = ?")
      .run(position, req.params.cardId);
  }

  // Update other fields
  db.prepare(`
    UPDATE cards SET 
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      assignee = COALESCE(?, assignee),
      due_date = COALESCE(?, due_date),
      tags = COALESCE(?, tags),
      bounty_algo = COALESCE(?, bounty_algo),
      creator_wallet = COALESCE(?, creator_wallet),
      assignee_wallet = COALESCE(?, assignee_wallet),
      escrow_app_id = COALESCE(?, escrow_app_id),
      deposit_tx_id = COALESCE(?, deposit_tx_id),
      release_tx_id = COALESCE(?, release_tx_id),
      refund_tx_id = COALESCE(?, refund_tx_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title ?? null,
    description ?? null,
    priority ?? null,
    status ?? null,
    assignee ?? null,
    due_date ?? null,
    tags ?? null,
    bounty_algo ?? null,
    creator_wallet ?? null,
    assignee_wallet ?? null,
    escrow_app_id ?? null,
    deposit_tx_id ?? null,
    release_tx_id ?? null,
    refund_tx_id ?? null,
    req.params.cardId
  );

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  res.json(updated);
});

// DELETE /api/cards/:cardId
router.delete('/:cardId', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId) as any;
  if (!card) return res.status(404).json({ error: 'Card not found' });

  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.cardId);
  db.prepare("UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?")
    .run(card.column_id, card.position);

  res.json({ ok: true });
});

// POST /api/cards/:cardId/deposit — record on-chain escrow funding
router.post('/:cardId/deposit', (req, res) => {
  const { escrow_app_id, creator_wallet, bounty_algo, deposit_tx_id } = req.body;
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  db.prepare(`
    UPDATE cards SET 
      escrow_app_id = COALESCE(?, escrow_app_id),
      creator_wallet = COALESCE(?, creator_wallet),
      bounty_algo = COALESCE(?, bounty_algo),
      deposit_tx_id = COALESCE(?, deposit_tx_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(escrow_app_id ?? null, creator_wallet ?? null, bounty_algo ?? null, deposit_tx_id ?? null, req.params.cardId);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  res.json(updated);
});

// POST /api/cards/:cardId/claim — bind user wallet to task
router.post('/:cardId/claim', (req, res) => {
  const { assignee_wallet } = req.body;
  if (!assignee_wallet || typeof assignee_wallet !== 'string') {
    return res.status(400).json({ error: 'assignee_wallet address is required' });
  }

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  db.prepare("UPDATE cards SET assignee_wallet = ?, updated_at = datetime('now') WHERE id = ?")
    .run(assignee_wallet, req.params.cardId);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  res.json(updated);
});

// POST /api/cards/:cardId/release — approve completion & record release tx
router.post('/:cardId/release', (req, res) => {
  const { release_tx_id } = req.body;
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  db.prepare("UPDATE cards SET release_tx_id = ?, status = 'done', updated_at = datetime('now') WHERE id = ?")
    .run(release_tx_id || 'RELEASE_VERIFIED', req.params.cardId);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  res.json(updated);
});

// POST /api/cards/:cardId/refund — cancel task & record refund tx
router.post('/:cardId/refund', (req, res) => {
  const { refund_tx_id } = req.body;
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  db.prepare("UPDATE cards SET refund_tx_id = ?, status = 'cancelled', updated_at = datetime('now') WHERE id = ?")
    .run(refund_tx_id || 'REFUND_VERIFIED', req.params.cardId);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  res.json(updated);
});

export default router;
