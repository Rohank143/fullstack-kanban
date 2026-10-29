import React, { useState } from 'react';
import { createCard } from '../../api/cards';
import './CreateCard.css';

interface CreateCardProps {
  boardId: string;
  columnId: string;
  onClose: () => void;
  onCreated: () => void;
}

const CreateCard: React.FC<CreateCardProps> = ({ boardId, columnId, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [bountyAlgo, setBountyAlgo] = useState('');
  const [assigneeWallet, setAssigneeWallet] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const bounty = parseFloat(bountyAlgo);
      await createCard({
        columnId,
        boardId,
        title: title.trim(),
        description,
        priority,
        bounty_algo: !isNaN(bounty) && bounty > 0 ? bounty : 0,
        creator_wallet: 'CREATOR_ALGO_WALLET_DEFAULT',
        assignee_wallet: assigneeWallet.trim() || undefined,
        escrow_app_id: !isNaN(bounty) && bounty > 0 ? `ESCROW_${Date.now().toString(36)}` : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create card:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-card-overlay" onClick={onClose}>
      <div className="create-card-modal" onClick={e => e.stopPropagation()}>
        <h3>Create Card</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Card title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          <div className="create-card-field-row">
            <select value={priority} onChange={e => setPriority(e.target.value as any)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Bounty (ALGO)"
              value={bountyAlgo}
              onChange={e => setBountyAlgo(e.target.value)}
              className="bounty-input"
            />
          </div>
          <input
            type="text"
            placeholder="Assignee Algorand Wallet Address (optional)"
            value={assigneeWallet}
            onChange={e => setAssigneeWallet(e.target.value)}
          />
          <div className="create-card-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCard;
