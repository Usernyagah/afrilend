require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  ContractCallQuery
} = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

const DEPLOYMENT_FILE = path.join(__dirname, '..', 'deployed-contracts.json');

console.log('\n🔍 Verifying Deployed Contracts...\n'.cyan.bold);

// Check if deployment file exists
if (!fs.existsSync(DEPLOYMENT_FILE)) {
  console.error('❌ No deployment file found. Deploy contracts first.\n'.red);
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8'));

// Initialize client
const network = deployment.network || 'testnet';
const envFile = network === 'mainnet' ? '.env.mainnet' : '.env.testnet';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

let client;

if (network === 'mainnet') {
  client = Client.forMainnet();
  console.log('🌐 Connected to Hedera Mainnet\n'.green);
} else {
  client = Client.forTestnet();
  console.log('🌐 Connected to Hedera Testnet\n'.yellow);
}

const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
// Use fromStringECDSA for ECDSA keys (with 0x prefix)
const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_PRIVATE_KEY);

client.setOperator(operatorId, operatorKey);

async function verifyContract(contractName, contractId) {
  console.log(`Verifying ${contractName} (${contractId})...`.yellow);
  
  try {
    // Try to call a read-only function to verify contract is accessible
    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000);
    
    // Different contracts have different view functions
    if (contractName === 'AfriLendLoanManager') {
      query.setFunction('getTotalLoans');
    } else if (contractName === 'LenderPool') {
      query.setFunction('getTotalPools');
    } else if (contractName === 'Reputation') {
      query.setFunction('getTotalUsers');
    }
    
    await query.execute(client);
    
    console.log(`✅ ${contractName} is active and accessible`.green);
    
    const explorerUrl = network === 'mainnet' 
      ? `https://hashscan.io/mainnet/contract/${contractId}`
      : `https://hashscan.io/testnet/contract/${contractId}`;
    console.log(`   🌐 View on HashScan: ${explorerUrl}\n`.cyan);
    
    return true;
  } catch (error) {
    console.error(`❌ ${contractName} verification failed: ${error.message}\n`.red);
    return false;
  }
}

async function main() {
  console.log('Deployment Information:'.cyan);
  console.log(`  Network: ${deployment.network}`.gray);
  console.log(`  Deployed: ${deployment.timestamp}`.gray);
  console.log(`  Operator: ${deployment.operator}\n`.gray);
  
  let allVerified = true;
  
  for (const [contractName, info] of Object.entries(deployment.contracts)) {
    const verified = await verifyContract(contractName, info.contractId);
    if (!verified) {
      allVerified = false;
    }
  }
  
  if (allVerified) {
    console.log('🎉 All contracts verified successfully!'.green.bold);
  } else {
    console.log('⚠️  Some contracts failed verification'.yellow.bold);
  }
  
  client.close();
}

main();
