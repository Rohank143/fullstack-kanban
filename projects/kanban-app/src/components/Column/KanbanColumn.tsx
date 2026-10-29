import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ColumnWithCards, Card } from '../../types';
import KanbanCard from '../Card/KanbanCard';
import './KanbanColumn.css';

interface KanbanColumnProps {
  column: ColumnWithCards;
  onCreateCard: () => void;
  onRefundCard?: (card: Card) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, onCreateCard, onRefundCard }) => {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className="kanban-column" ref={setNodeRef}>
      <div className="column-header">
        <h2>{column.title}</h2>
        <span className="card-count">{column.cards.length}</span>
      </div>
      <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="column-cards">
          {column.cards.map(card => (
            <KanbanCard key={card.id} card={card} onRefundClick={onRefundCard} />
          ))}
        </div>
      </SortableContext>
      <button className="add-card-btn" onClick={onCreateCard}>
        + Add card
      </button>
    </div>
  );
};

export default KanbanColumn;
