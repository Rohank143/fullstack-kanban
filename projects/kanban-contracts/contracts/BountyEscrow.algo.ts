import { Contract } from '@algorandfoundation/tealscript';

/**
 * BountyEscrow Smart Contract for Algorand
 * 
 * Implements trustless locking and lifecycle of native ALGO bounties for Kanban tasks:
 * - Creator deposits ALGO into application escrow.
 * - Eligible assignee claims/binds their address.
 * - Upon verified completion, creator releases funds to the assignee via inner payment transaction.
 * - If cancelled or expired, creator can refund the escrowed deposit back to their address.
 * - Access control strictly restricts release and refund actions to the task creator.
 */
export class BountyEscrow extends Contract {
  /** Wallet address of the task creator */
  creator = GlobalStateKey<Address>();

  /** Associated task ID from Kanban board */
  taskId = GlobalStateKey<bytes>();

  /** Locked bounty amount in microAlgos */
  bountyAmount = GlobalStateKey<uint64>();

  /** Bound wallet address of task assignee */
  assignee = GlobalStateKey<Address>();

  /** Escrow lifecycle states */
  isFunded = GlobalStateKey<boolean>();
  isReleased = GlobalStateKey<boolean>();
  isRefunded = GlobalStateKey<boolean>();

  /**
   * Initializes the escrow application for a specific task and creator.
   * @param taskId Unique identifier of the task
   */
  createApplication(taskId: bytes): void {
    this.creator.value = this.txn.sender;
    this.taskId.value = taskId;
    this.bountyAmount.value = 0;
    this.isFunded.value = false;
    this.isReleased.value = false;
    this.isRefunded.value = false;
  }

  /**
   * Deposits native ALGO bounty into application escrow.
   * Must be grouped with a payment transaction to this app address.
   * @param payTxn Payment transaction transferring ALGO into the contract escrow account
   */
  depositBounty(payTxn: PayTxn): void {
    assert(this.txn.sender === this.creator.value, 'Only creator can deposit bounty');
    assert(!this.isFunded.value, 'Bounty already funded');
    assert(payTxn.receiver === this.app.address, 'Payment must be sent to escrow application address');
    assert(payTxn.amount > 0, 'Bounty amount must be greater than zero');

    this.bountyAmount.value = payTxn.amount;
    this.isFunded.value = true;
  }

  /**
   * Assignee claims the task and binds their wallet address.
   * @param assigneeAddress Wallet address of the contributor claiming the task
   */
  claimTask(assigneeAddress: Address): void {
    assert(this.isFunded.value, 'Task must be funded before claiming');
    assert(!this.isReleased.value && !this.isRefunded.value, 'Escrow already settled');
    assert(this.assignee.value === Address.zeroAddress, 'Task is already assigned');

    this.assignee.value = assigneeAddress;
  }

  /**
   * Releases escrowed ALGO payout to the assignee upon verified completion.
   * Can only be called by the task creator.
   */
  releaseBounty(): void {
    assert(this.txn.sender === this.creator.value, 'Unauthorized: only task creator can release payout');
    assert(this.isFunded.value, 'Escrow not funded');
    assert(!this.isReleased.value, 'Bounty already released');
    assert(!this.isRefunded.value, 'Bounty was already refunded');
    assert(this.assignee.value !== Address.zeroAddress, 'No assignee bound to task');

    this.isReleased.value = true;

    // Disburse bounty to assignee via inner payment transaction
    sendPayment({
      receiver: this.assignee.value,
      amount: this.bountyAmount.value,
    });
  }

  /**
   * Refunds escrowed ALGO back to creator if task is cancelled or abandoned.
   * Can only be called by the task creator.
   */
  refundBounty(): void {
    assert(this.txn.sender === this.creator.value, 'Unauthorized: only task creator can request refund');
    assert(this.isFunded.value, 'Escrow not funded');
    assert(!this.isReleased.value, 'Cannot refund released bounty');
    assert(!this.isRefunded.value, 'Bounty already refunded');

    this.isRefunded.value = true;

    // Disburse refund back to creator via inner payment transaction
    sendPayment({
      receiver: this.creator.value,
      amount: this.bountyAmount.value,
    });
  }
}
