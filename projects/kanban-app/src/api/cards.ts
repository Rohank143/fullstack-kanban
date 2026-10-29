import type { Card, CreateCardRequest, UpdateCardRequest, MoveCardRequest } from '../types';

const API_BASE = '/api';

export async function getCards(columnId?: string): Promise<Card[]> {
  const url = columnId
    ? `${API_BASE}/cards?column_id=${columnId}`
    : `${API_BASE}/cards`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.statusText}`);
  return res.json();
}

export async function createCard(data: CreateCardRequest): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create card: ${res.statusText}`);
  return res.json();
}

export async function updateCard(id: string, data: UpdateCardRequest): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update card: ${res.statusText}`);
  return res.json();
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete card: ${res.statusText}`);
}

export async function moveCard(id: string, data: MoveCardRequest): Promise<Card> {
  return updateCard(id, {
    column_id: data.targetColumnId,
    position: data.targetPosition,
  });
}

export async function releaseCardBounty(id: string, releaseTxId?: string): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ release_tx_id: releaseTxId }),
  });
  if (!res.ok) throw new Error(`Failed to release bounty: ${res.statusText}`);
  return res.json();
}

export async function refundCardBounty(id: string, refundTxId?: string): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refund_tx_id: refundTxId }),
  });
  if (!res.ok) throw new Error(`Failed to refund bounty: ${res.statusText}`);
  return res.json();
}

export async function depositCardBounty(id: string, data: {
  escrow_app_id: string;
  creator_wallet: string;
  bounty_algo: number;
  deposit_tx_id: string;
}): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to deposit bounty: ${res.statusText}`);
  return res.json();
}

export async function claimCardBounty(id: string, assignee_wallet: string): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignee_wallet }),
  });
  if (!res.ok) throw new Error(`Failed to claim bounty: ${res.statusText}`);
  return res.json();
}
