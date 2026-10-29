import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { BoardWithColumns, ColumnWithCards, Card } from '../../types';
import { getBoard } from '../../api/boards';
import { moveCard } from '../../api/cards';
import KanbanColumn from '../Column/KanbanColumn';
import KanbanCard from '../Card/KanbanCard';
import CreateCard from '../Card/CreateCard';
import EscrowModal from '../Card/EscrowModal';
import './Board.css';

const Board: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<BoardWithColumns | null>(null);
  const [columns, setColumns] = useState<ColumnWithCards[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Escrow modal state
  const [escrowCard, setEscrowCard] = useState<Card | null>(null);
  const [escrowAction, setEscrowAction] = useState<'release' | 'refund' | null>(null);
  const [pendingDoneCol, setPendingDoneCol] = useState<ColumnWithCards | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      const data = await getBoard(boardId);
      setBoard(data);
      setColumns(data.columns || []);
    } catch (err) {
      console.error('Failed to fetch board:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleDragStart = (event: DragStartEvent) => {
    const card = columns
      .flatMap(col => col.cards)
      .find(c => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !boardId) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    // Find target column
    let targetCol = columns.find(col => col.id === overId);
    if (!targetCol) {
      targetCol = columns.find(col => col.cards.some(c => c.id === overId));
    }
    if (!targetCol) return;

    const card = columns
      .flatMap(col => col.cards)
      .find(c => c.id === cardId);

    // If moving to 'Done' column and card has escrow that is not yet released
    const isTargetDone = targetCol.title.trim().toLowerCase() === 'done';
    const hasActiveEscrow = card && ((card.bounty_algo ?? 0) > 0 || Boolean(card.escrow_app_id)) && !card.release_tx_id && !card.refund_tx_id;

    if (isTargetDone && hasActiveEscrow && card) {
      // Prompt creator to approve completion and sign release transaction
      setEscrowCard(card);
      setEscrowAction('release');
      setPendingDoneCol(targetCol);
      return;
    }

    try {
      await moveCard(cardId, {
        targetColumnId: targetCol.id,
        targetPosition: targetCol.cards.length,
      });
      await fetchBoard();
    } catch (err) {
      console.error('Failed to move card:', err);
    }
  };

  const handleEscrowSuccess = async (updatedCard: Card) => {
    if (escrowAction === 'release' && pendingDoneCol) {
      try {
        await moveCard(updatedCard.id, {
          targetColumnId: pendingDoneCol.id,
          targetPosition: pendingDoneCol.cards.length,
        });
      } catch (err) {
        console.error('Failed to move released card to Done:', err);
      }
    }
    setEscrowCard(null);
    setEscrowAction(null);
    setPendingDoneCol(null);
    await fetchBoard();
  };

  const openCreateCard = (columnId: string) => {
    setTargetColumnId(columnId);
    setShowCreateCard(true);
  };

  const handleRefundCard = (card: Card) => {
    setEscrowCard(card);
    setEscrowAction('refund');
  };

  if (loading) return <div className="board-loading">Loading board...</div>;
  if (!board) return <div className="board-error">Board not found. <Link to="/">Go back</Link></div>;

  return (
    <div className="board-container">
      <header className="board-header">
        <Link to="/" className="back-link">&larr; All Boards</Link>
        <h1>{board.title}</h1>
        {board.description && <p className="board-description">{board.description}</p>}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCreateCard={() => openCreateCard(column.id)}
              onRefundCard={handleRefundCard}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {showCreateCard && targetColumnId && boardId && (
        <CreateCard
          boardId={boardId}
          columnId={targetColumnId}
          onClose={() => setShowCreateCard(false)}
          onCreated={fetchBoard}
        />
      )}

      {escrowCard && escrowAction && (
        <EscrowModal
          card={escrowCard}
          action={escrowAction}
          onClose={() => {
            setEscrowCard(null);
            setEscrowAction(null);
            setPendingDoneCol(null);
          }}
          onSuccess={handleEscrowSuccess}
        />
      )}
    </div>
  );
};

export default Board;
