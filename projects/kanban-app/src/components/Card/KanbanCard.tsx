import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types';
import './KanbanCard.css';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  onClick?: () => void;
  onRefundClick?: (card: Card) => void;
}

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  urgent: '#ef4444',
};

const KanbanCard: React.FC<KanbanCardProps> = ({ card, isDragging, onClick, onRefundClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasBounty = (card.bounty_algo ?? 0) > 0 || Boolean(card.escrow_app_id);
  const isReleased = Boolean(card.release_tx_id);
  const isRefunded = Boolean(card.refund_tx_id);
  const isCancelled = card.status === 'cancelled';
  const isDone = card.status === 'done';

  const canRefund = hasBounty && !isReleased && !isRefunded && !isDone && !isCancelled;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <span
          className="priority-dot"
          style={{ background: priorityColors[card.priority] || '#94a3b8' }}
          title={card.priority}
        />
        <span className="card-title">{card.title}</span>
      </div>

      {card.description && (
        <p className="card-description">{card.description.slice(0, 80)}</p>
      )}

      {/* Bounty and Escrow Indicators */}
      {hasBounty && (
        <div className="bounty-badge-container">
          <span className="bounty-pill" title={`Bounty: ${card.bounty_algo || 0} ALGO`}>
            ⚡ {card.bounty_algo || 0} ALGO
          </span>

          {isReleased && (
            <span className="escrow-status-pill released" title={`Released: ${card.release_tx_id}`}>
              ✅ Released
            </span>
          )}

          {isRefunded && (
            <span className="escrow-status-pill refunded" title={`Refunded: ${card.refund_tx_id}`}>
              ↩️ Refunded
            </span>
          )}

          {!isReleased && !isRefunded && !isCancelled && (
            <span className="escrow-status-pill locked" title="Escrow locked on-chain">
              🔒 Locked
            </span>
          )}
        </div>
      )}

      <div className="card-meta">
        {card.dueDate && (
          <span className="card-due">📅 {new Date(card.dueDate).toLocaleDateString()}</span>
        )}
        {(card.assignee_wallet || card.assignee) && (
          <span className="card-assignee" title={card.assignee_wallet || card.assignee || ''}>
            👤 {(card.assignee_wallet || card.assignee || '').slice(0, 10)}...
          </span>
        )}
      </div>

      {/* Creator Refund Action on uncompleted task */}
      {canRefund && onRefundClick && (
        <div className="card-escrow-actions">
          <button
            type="button"
            className="btn-card-refund"
            title="Cancel task and refund locked ALGO bounty to creator"
            onClick={(e) => {
              e.stopPropagation();
              onRefundClick(card);
            }}
          >
            ↩️ Cancel & Refund
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanCard;
