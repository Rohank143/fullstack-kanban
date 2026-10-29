import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Functional test suite for BountyEscrow contract behavior and lifecycle
 */
class BountyEscrowSimulator {
  constructor(creator, taskId) {
    this.creator = creator;
    this.taskId = taskId;
    this.bountyAmount = 0n;
    this.assignee = null;
    this.isFunded = false;
    this.isReleased = false;
    this.isRefunded = false;
    this.appAddress = 'APP_ESCROW_ADDR_TEST';
    this.disbursedPayments = [];
  }

  depositBounty(caller, payTxn) {
    if (caller !== this.creator) throw new Error('Only creator can deposit bounty');
    if (this.isFunded) throw new Error('Bounty already funded');
    if (payTxn.receiver !== this.appAddress) throw new Error('Payment must be sent to escrow application address');
    if (payTxn.amount <= 0n) throw new Error('Bounty amount must be greater than zero');

    this.bountyAmount = payTxn.amount;
    this.isFunded = true;
    return 'TX_DEPOSIT_CONFIRMED';
  }

  claimTask(assigneeAddress) {
    if (!this.isFunded) throw new Error('Task must be funded before claiming');
    if (this.isReleased || this.isRefunded) throw new Error('Escrow already settled');
    if (this.assignee !== null) throw new Error('Task is already assigned');

    this.assignee = assigneeAddress;
    return 'TASK_CLAIM_BOUND';
  }

  releaseBounty(caller) {
    if (caller !== this.creator) throw new Error('Unauthorized: only task creator can release payout');
    if (!this.isFunded) throw new Error('Escrow not funded');
    if (this.isReleased) throw new Error('Bounty already released');
    if (this.isRefunded) throw new Error('Bounty was already refunded');
    if (!this.assignee) throw new Error('No assignee bound to task');

    this.isReleased = true;
    this.disbursedPayments.push({
      receiver: this.assignee,
      amount: this.bountyAmount,
      type: 'PAYOUT_RELEASE'
    });
    return 'TX_RELEASE_CONFIRMED';
  }

  refundBounty(caller) {
    if (caller !== this.creator) throw new Error('Unauthorized: only task creator can request refund');
    if (!this.isFunded) throw new Error('Escrow not funded');
    if (this.isReleased) throw new Error('Cannot refund released bounty');
    if (this.isRefunded) throw new Error('Bounty already refunded');

    this.isRefunded = true;
    this.disbursedPayments.push({
      receiver: this.creator,
      amount: this.bountyAmount,
      type: 'REFUND_DISBURSED'
    });
    return 'TX_REFUND_CONFIRMED';
  }
}

test('BountyEscrow Contract - Deposit, Claim, and Release Flow', () => {
  const creator = 'CREATOR_WALLET_ALGORAND_AAA';
  const assignee = 'ASSIGNEE_WALLET_ALGORAND_BBB';
  const escrow = new BountyEscrowSimulator(creator, 'task-issue-3');

  // 1. Deposit
  const depositTx = escrow.depositBounty(creator, {
    receiver: 'APP_ESCROW_ADDR_TEST',
    amount: 5_000_000n // 5 ALGO
  });
  assert.strictEqual(depositTx, 'TX_DEPOSIT_CONFIRMED');
  assert.strictEqual(escrow.isFunded, true);
  assert.strictEqual(escrow.bountyAmount, 5_000_000n);

  // 2. Claim
  const claimRes = escrow.claimTask(assignee);
  assert.strictEqual(claimRes, 'TASK_CLAIM_BOUND');
  assert.strictEqual(escrow.assignee, assignee);

  // 3. Release by creator
  const releaseTx = escrow.releaseBounty(creator);
  assert.strictEqual(releaseTx, 'TX_RELEASE_CONFIRMED');
  assert.strictEqual(escrow.isReleased, true);
  assert.strictEqual(escrow.disbursedPayments.length, 1);
  assert.strictEqual(escrow.disbursedPayments[0].receiver, assignee);
  assert.strictEqual(escrow.disbursedPayments[0].amount, 5_000_000n);
});

test('BountyEscrow Contract - Unauthorized Release Rejected', () => {
  const creator = 'CREATOR_WALLET_ALGORAND_AAA';
  const attacker = 'ATTACKER_WALLET_HACKER';
  const assignee = 'ASSIGNEE_WALLET_ALGORAND_BBB';
  const escrow = new BountyEscrowSimulator(creator, 'task-issue-5');

  escrow.depositBounty(creator, { receiver: 'APP_ESCROW_ADDR_TEST', amount: 2_000_000n });
  escrow.claimTask(assignee);

  // Attacker attempts to trigger release
  assert.throws(() => {
    escrow.releaseBounty(attacker);
  }, /Unauthorized: only task creator can release payout/);
  assert.strictEqual(escrow.isReleased, false);
});

test('BountyEscrow Contract - Refund Flow When Task Cancelled', () => {
  const creator = 'CREATOR_WALLET_ALGORAND_AAA';
  const escrow = new BountyEscrowSimulator(creator, 'task-issue-6');

  escrow.depositBounty(creator, { receiver: 'APP_ESCROW_ADDR_TEST', amount: 10_000_000n });
  
  // Creator issues refund
  const refundTx = escrow.refundBounty(creator);
  assert.strictEqual(refundTx, 'TX_REFUND_CONFIRMED');
  assert.strictEqual(escrow.isRefunded, true);
  assert.strictEqual(escrow.disbursedPayments.length, 1);
  assert.strictEqual(escrow.disbursedPayments[0].receiver, creator);
  assert.strictEqual(escrow.disbursedPayments[0].amount, 10_000_000n);

  // Subsequent release attempt must fail
  assert.throws(() => {
    escrow.releaseBounty(creator);
  }, /Bounty was already refunded/);
});

test('BountyEscrow Contract - Unauthorized Refund Rejected', () => {
  const creator = 'CREATOR_WALLET_ALGORAND_AAA';
  const attacker = 'ATTACKER_WALLET_HACKER';
  const escrow = new BountyEscrowSimulator(creator, 'task-issue-6');

  escrow.depositBounty(creator, { receiver: 'APP_ESCROW_ADDR_TEST', amount: 10_000_000n });

  assert.throws(() => {
    escrow.refundBounty(attacker);
  }, /Unauthorized: only task creator can request refund/);
  assert.strictEqual(escrow.isRefunded, false);
});
