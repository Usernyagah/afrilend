require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow,
  Hbar,
  AccountBalanceQuery
} = require('@hashgraph/sdk');
const fs = require('fs-extra');
const path = require('path');
const colors = require('colors');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const DEPLOYMENT_FILE = path.join(__dirname, '..', 'deployed-contracts.json');

// Get network from command line argument
const network = process.argv[2] || 'testnet';

console.log(`\n${'='.repeat(60)}`.cyan);
console.log(`🚀 Deploying AfriLend Contracts to Hedera ${network.toUpperCase()}`.cyan.bold);
console.log(`${'='.repeat(60)}\n`.cyan);

// Load environment variables
const envFile = network === 'mainnet' ? '.env.mainnet' : '.env.testnet';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

// Validate environment variables
if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_PRIVATE_KEY) {
  console.error('❌ Error: Missing required environment variables'.red.bold);
  console.error(`   Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_PRIVATE_KEY in ${envFile}\n`.red);
  process.exit(1);
}

// Initialize Hedera client
let client;
if (network === 'mainnet') {
  client = Client.forMainnet();
  console.log('🌐 Connected to Hedera Mainnet'.green);
} else {
  client = Client.forTestnet();
  console.log('🌐 Connected to Hedera Testnet'.yellow);
}

const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
// Use fromStringECDSA for ECDSA keys (with 0x prefix)
const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_PRIVATE_KEY);

client.setOperator(operatorId, operatorKey);

console.log(`👤 Operator Account: ${operatorId.toString()}`.gray);

// Deployment configuration
const MAX_GAS = parseInt(process.env.MAX_GAS) || 2000000;

async function getAccountBalance() {
  const query = new AccountBalanceQuery()
    .setAccountId(operatorId);
  const balance = await query.execute(client);
  return balance.hbars.toString();
}

async function deployContract(contractName, constructorParams = null) {
  console.log(`\n${'─'.repeat(60)}`.gray);
  console.log(`📄 Deploying ${contractName}...`.yellow.bold);
  
  try {
    // Load compiled contract
    const artifactPath = path.join(BUILD_DIR, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}. Run 'npm run compile' first.`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode;
    
    if (!bytecode || bytecode === '0x') {
      throw new Error(`Invalid bytecode for ${contractName}`);
    }
    
    console.log(`   Bytecode size: ${(bytecode.length / 2).toLocaleString()} bytes`.gray);
    
    // Create contract
    const contractCreateFlow = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(MAX_GAS)
      .setInitialBalance(new Hbar(0));
    
    if (constructorParams) {
      contractCreateFlow.setConstructorParameters(constructorParams);
    }
    
    console.log(`   ⏳ Submitting transaction...`.gray);
    const txResponse = await contractCreateFlow.execute(client);
    
    console.log(`   ⏳ Waiting for receipt...`.gray);
    const receipt = await txResponse.getReceipt(client);
    
    const contractId = receipt.contractId;
    
    console.log(`   ✅ ${contractName} deployed successfully!`.green.bold);
    console.log(`   📋 Contract ID: ${contractId.toString()}`.green);
    console.log(`   🔗 Transaction ID: ${txResponse.transactionId.toString()}`.gray);
    
    // Explorer link
    const explorerUrl = network === 'mainnet' 
      ? `https://hashscan.io/mainnet/contract/${contractId.toString()}`
      : `https://hashscan.io/testnet/contract/${contractId.toString()}`;
    console.log(`   🌐 Explorer: ${explorerUrl}`.cyan);
    
    return {
      contractId: contractId.toString(),
      transactionId: txResponse.transactionId.toString(),
      timestamp: new Date().toISOString(),
      explorerUrl: explorerUrl
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to deploy ${contractName}:`.red.bold);
    console.error(`   ${error.message}`.red);
    throw error;
  }
}

async function main() {
  try {
    // Check initial balance
    const initialBalance = await getAccountBalance();
    console.log(`\n💰 Account Balance: ${initialBalance}\n`.cyan);
    
    if (parseFloat(initialBalance) < 10 && network === 'testnet') {
      console.warn('⚠️  Warning: Low account balance.'.yellow);
      console.warn('   Get free testnet HBAR from: https://portal.hedera.com/faucet\n'.yellow);
    }
    
    const deployedContracts = {};
    
    // Deploy Reputation Contract
    console.log('1️⃣  Deploying Reputation System...'.cyan.bold);
    const reputation = await deployContract('Reputation');
    deployedContracts.Reputation = reputation;
    
    // Deploy LenderPool Contract
    console.log('\n2️⃣  Deploying Lender Pool...'.cyan.bold);
    const lenderPool = await deployContract('LenderPool');
    deployedContracts.LenderPool = lenderPool;
    
    // Deploy AfriLendLoanManager Contract
    console.log('\n3️⃣  Deploying Loan Manager...'.cyan.bold);
    const loanManager = await deployContract('AfriLendLoanManager');
    deployedContracts.AfriLendLoanManager = loanManager;
    
    // Save deployment information
    const deploymentInfo = {
      network: network,
      timestamp: new Date().toISOString(),
      operator: operatorId.toString(),
      contracts: deployedContracts
    };
    
    fs.writeFileSync(
      DEPLOYMENT_FILE,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`.green);
    console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!'.green.bold);
    console.log(`${'='.repeat(60)}\n`.green);
    
    console.log('📋 Deployed Contracts:'.cyan.bold);
    Object.entries(deployedContracts).forEach(([name, info]) => {
      console.log(`   ${name}: ${info.contractId}`.green);
    });
    
    const finalBalance = await getAccountBalance();
    console.log(`\n💰 Final Balance: ${finalBalance}`.cyan);
    console.log(`💸 Deployment Cost: ~${(parseFloat(initialBalance) - parseFloat(finalBalance)).toFixed(2)} HBAR`.gray);
    
    console.log(`\n📄 Deployment details saved to: ${DEPLOYMENT_FILE}`.gray);
    
    console.log('\n⚠️  IMPORTANT: Update your server/.env file with these contract IDs:'.yellow.bold);
    console.log(`\nHEDERA_NETWORK=${network}`.yellow);
    console.log(`HEDERA_OPERATOR_ID=${operatorId.toString()}`.yellow);
    console.log(`HEDERA_OPERATOR_PRIVATE_KEY=${process.env.HEDERA_OPERATOR_PRIVATE_KEY}`.yellow);
    console.log(`AFRILEND_LOAN_MANAGER_CONTRACT=${deployedContracts.AfriLendLoanManager.contractId}`.yellow);
    console.log(`LENDER_POOL_CONTRACT=${deployedContracts.LenderPool.contractId}`.yellow);
    console.log(`REPUTATION_CONTRACT=${deployedContracts.Reputation.contractId}\n`.yellow);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:'.red.bold);
    console.error(error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
