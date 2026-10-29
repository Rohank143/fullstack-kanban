import React, { useState } from 'react';
import { createBoard } from '../../api/boards';
import './CreateCard.css';

interface CreateBoardProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateBoard: React.FC<CreateBoardProps> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await createBoard({ title: title.trim(), description });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-card-overlay" onClick={onClose}>
      <div className="create-card-modal" onClick={e => e.stopPropagation()}>
        <h3>Create New Board</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Board title"
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

export default CreateBoard;
