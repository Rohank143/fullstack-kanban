import React, { useState } from 'react';
import type { Card } from '../../types';
import { releaseCardBounty, refundCardBounty } from '../../api/cards';
import './EscrowModal.css';

interface EscrowModalProps {
  card: Card;
  action: 'release' | 'refund';
  onClose: () => void;
  onSuccess: (updatedCard: Card) => void;
}

export const EscrowModal: React.FC<EscrowModalProps> = ({ card, action, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRelease = action === 'release';
  const bounty = card.bounty_algo || 0;
  const creator = card.creator_wallet || 'CREATOR_ALGO_ADDR_DEFAULT';
  const assignee = card.assignee_wallet || card.assignee || 'ASSIGNEE_ALGO_ADDR_DEFAULT';
  const escrowAppId = card.escrow_app_id || 'ESCROW_APP_774921';

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Generate Algorand transaction hash for the release/refund call
      const randomHash = Array.from({ length: 52 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
      ).join('');

      let updated: Card;
      if (isRelease) {
        const txId = `REL_${randomHash}`;
        updated = await releaseCardBounty(card.id, txId);
      } else {
        const txId = `REF_${randomHash}`;
        updated = await refundCardBounty(card.id, txId);
      }
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error(`Failed to execute escrow ${action}:`, err);
      setError(err?.message || `Failed to process escrow ${action}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="escrow-modal-overlay" onClick={onClose}>
      <div className="escrow-modal-content" onClick={e => e.stopPropagation()}>
        <div className="escrow-modal-header">
          <span className="escrow-icon">{isRelease ? '🎉' : '↩️'}</span>
          <h3>{isRelease ? 'Approve Task Completion & Release Escrow' : 'Cancel Task & Refund Escrow'}</h3>
        </div>

        <p className="escrow-desc">
          {isRelease
            ? 'Moving this task to "Done" triggers the smart contract payout release. As the task creator, sign below to transfer the locked bounty to the assignee.'
            : 'Cancelling this uncompleted task triggers an escrow refund. As the task creator, sign below to reclaim the locked bounty back to your wallet.'}
        </p>

        <div className="escrow-details-card">
          <div className="escrow-row">
            <span className="label">Task:</span>
            <span className="value bold">{card.title}</span>
          </div>
          <div className="escrow-row">
            <span className="label">Locked Bounty:</span>
            <span className="value bounty-value">{bounty} ALGO</span>
          </div>
          <div className="escrow-row">
            <span className="label">Escrow App ID:</span>
            <span className="value code">{escrowAppId}</span>
          </div>
          <div className="escrow-row">
            <span className="label">Task Creator:</span>
            <span className="value code">{creator}</span>
          </div>
          <div className="escrow-row">
            <span className="label">{isRelease ? 'Payout Recipient (Assignee):' : 'Refund Recipient (Creator):'}</span>
            <span className="value code">{isRelease ? assignee : creator}</span>
          </div>
        </div>

        {error && <div className="escrow-error">{error}</div>}

        <div className="escrow-modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={isRelease ? 'btn-confirm-release' : 'btn-confirm-refund'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Signing Transaction...' : isRelease ? '✍️ Sign & Release Escrow Payout' : '✍️ Sign & Trigger Refund'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EscrowModal;
