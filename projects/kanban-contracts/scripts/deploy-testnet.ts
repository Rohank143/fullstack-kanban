import algosdk from 'algosdk';

/**
 * Deployment helper for BountyEscrow contract to Algorand TestNet
 */
export async function deployBountyEscrowTestNet(creatorMnemonic: string, taskId: string) {
  const algodToken = process.env.ALGOD_TOKEN || '';
  const algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
  const algodPort = process.env.ALGOD_PORT || '443';

  const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
  const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);

  console.log(`Deploying BountyEscrow on Algorand TestNet for task: ${taskId}`);
  console.log(`Creator Address: ${creatorAccount.addr}`);

  // Deployment params and compilation flow
  const params = await algodClient.getTransactionParams().do();
  
  return {
    creatorAddress: creatorAccount.addr,
    taskId,
    suggestedParams: params,
    network: 'testnet',
  };
}

if (process.argv[1]?.endsWith('deploy-testnet.ts')) {
  const mnemonic = process.env.CREATOR_MNEMONIC;
  const taskId = process.argv[2] || 'task-demo-1';
  if (!mnemonic) {
    console.error('CREATOR_MNEMONIC environment variable is required');
    process.exit(1);
  }
  deployBountyEscrowTestNet(mnemonic, taskId)
    .then(res => console.log('Deployment initialized:', res))
    .catch(err => {
      console.error('Deployment error:', err);
      process.exit(1);
    });
}
