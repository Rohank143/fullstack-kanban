import type { Board, BoardWithColumns, CreateBoardRequest, UpdateBoardRequest } from '../types';

const API_BASE = '/api';

export async function getBoards(): Promise<Board[]> {
  const res = await fetch(`${API_BASE}/boards`);
  if (!res.ok) throw new Error(`Failed to fetch boards: ${res.statusText}`);
  return res.json();
}

export async function getBoard(id: string): Promise<BoardWithColumns> {
  const res = await fetch(`${API_BASE}/boards/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch board: ${res.statusText}`);
  return res.json();
}

export async function createBoard(data: CreateBoardRequest): Promise<Board> {
  const res = await fetch(`${API_BASE}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create board: ${res.statusText}`);
  return res.json();
}

export async function updateBoard(id: string, data: UpdateBoardRequest): Promise<Board> {
  const res = await fetch(`${API_BASE}/boards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update board: ${res.statusText}`);
  return res.json();
}

export async function deleteBoard(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/boards/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete board: ${res.statusText}`);
}
