// Core domain types shared between frontend and backend

export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string;
  position: number;
  status: string;
  assignee: string | null;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string;
  bounty_algo?: number;
  creator_wallet?: string;
  assignee_wallet?: string;
  escrow_app_id?: string;
  deposit_tx_id?: string;
  release_tx_id?: string;
  refund_tx_id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface View {
  id: string;
  boardId: string;
  name: string;
  filters: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  createdAt: string;
  updatedAt: string;
}

// API request/response types
export interface CreateBoardRequest {
  title: string;
  description?: string;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
}

export interface CreateCardRequest {
  columnId: string;
  boardId: string;
  title: string;
  description?: string;
  status?: string;
  assignee?: string;
  dueDate?: string;
  priority?: Card['priority'];
  tags?: string;
  bounty_algo?: number;
  creator_wallet?: string;
  assignee_wallet?: string;
  escrow_app_id?: string;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  column_id?: string;
  position?: number;
  status?: string;
  assignee?: string;
  dueDate?: string;
  priority?: Card['priority'];
  tags?: string;
  bounty_algo?: number;
  creator_wallet?: string;
  assignee_wallet?: string;
  escrow_app_id?: string;
  deposit_tx_id?: string;
  release_tx_id?: string;
  refund_tx_id?: string;
}

export interface MoveCardRequest {
  targetColumnId: string;
  targetPosition: number;
}

export interface SearchQuery {
  q?: string;
  status?: string;
  assignee?: string;
  dueBefore?: string;
  dueAfter?: string;
  boardId?: string;
}

export interface CalendarQuery {
  from: string;
  to: string;
  boardId?: string;
}

export interface CreateViewRequest {
  boardId: string;
  name: string;
  filters?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Board with nested columns and cards for full board view
export interface BoardWithColumns extends Board {
  columns: ColumnWithCards[];
}

export interface ColumnWithCards extends Column {
  cards: Card[];
}
