# AfriLend Contracts Deployment Setup Script
# This script creates all necessary files for Hedera deployment

$contractsDir = "c:\Users\Christine\Desktop\Afri-lend\contracts"
Set-Location $contractsDir

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "🚀 AfriLend Deployment Setup" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Create scripts directory
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "scripts" | Out-Null

# Create package.json
Write-Host "📦 Creating package.json..." -ForegroundColor Yellow
@"
{
  "name": "afrilend-contracts",
  "version": "1.0.0",
  "description": "Smart contracts for AfriLend platform on Hedera",
  "main": "index.js",
  "scripts": {
    "compile": "node scripts/compile.js",
    "deploy:testnet": "node scripts/deploy.js testnet",
    "deploy:mainnet": "node scripts/deploy.js mainnet",
    "verify": "node scripts/verify.js"
  },
  "keywords": ["hedera", "smart-contracts", "solidity", "defi"],
  "author": "AfriLend Team",
  "license": "MIT",
  "dependencies": {
    "@hashgraph/sdk": "^2.40.0",
    "solc": "^0.8.19",
    "dotenv": "^16.3.1",
    "colors": "^1.4.0"
  },
  "devDependencies": {
    "fs-extra": "^11.2.0"
  }
}
"@ | Out-File -FilePath "package.json" -Encoding utf8

# Create .env.testnet
Write-Host "🔐 Creating .env.testnet..." -ForegroundColor Yellow
@"
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.7123605
HEDERA_OPERATOR_PRIVATE_KEY=0x709f97d937d84750d19c53df9801941438acca37507230be8800640c9bba4974
MAX_GAS=2000000
"@ | Out-File -FilePath ".env.testnet" -Encoding utf8

# Create .gitignore
Write-Host "🚫 Creating .gitignore..." -ForegroundColor Yellow
@"
node_modules/
build/
.env
.env.mainnet
.env.testnet
deployed-contracts.json
*.log
npm-debug.log*
.DS_Store
Thumbs.db
"@ | Out-File -FilePath ".gitignore" -Encoding utf8

# Create compile.js
Write-Host "🔨 Creating scripts/compile.js..." -ForegroundColor Yellow
@"
const solc = require('solc');
const fs = require('fs-extra');
const path = require('path');
const colors = require('colors');

const CONTRACTS_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(CONTRACTS_DIR, 'build');

// Ensure build directory exists
fs.ensureDirSync(BUILD_DIR);

// Contracts to compile
const contracts = [
  'AfriLendLoanManager.sol',
  'LenderPool.sol',
  'Reputation.sol'
];

console.log('🔨 Compiling smart contracts...'.blue);

// Read interface file
function readInterfaceFile(filename) {
  const interfacePath = path.join(CONTRACTS_DIR, 'interfaces', filename);
  if (fs.existsSync(interfacePath)) {
    return fs.readFileSync(interfacePath, 'utf8');
  }
  return null;
}

// Prepare sources
const sources = {};

// Add main contracts
contracts.forEach(contract => {
  const contractPath = path.join(CONTRACTS_DIR, contract);
  const contractSource = fs.readFileSync(contractPath, 'utf8');
  sources[contract] = { content: contractSource };
});

// Add interface if exists
const iLoanManagerContent = readInterfaceFile('ILoanManager.sol');
if (iLoanManagerContent) {
  sources['interfaces/ILoanManager.sol'] = { content: iLoanManagerContent };
}

// Compiler input
const input = {
  language: 'Solidity',
  sources: sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
      }
    }
  }
};

// Compile
console.log('⚙️  Running Solidity compiler...'.yellow);
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  let hasError = false;
  output.errors.forEach(error => {
    if (error.severity === 'error') {
      console.error(`❌ $${error.formattedMessage}`.red);
      hasError = true;
    } else {
      console.warn(`⚠️  $${error.formattedMessage}`.yellow);
    }
  });
  
  if (hasError) {
    process.exit(1);
  }
}

// Save compiled contracts
contracts.forEach(contract => {
  const contractName = path.basename(contract, '.sol');
  const compiledContract = output.contracts[contract][contractName];
  
  if (!compiledContract) {
    console.error(`❌ Failed to compile $${contractName}`.red);
    return;
  }
  
  const artifact = {
    contractName: contractName,
    abi: compiledContract.abi,
    bytecode: compiledContract.evm.bytecode.object,
    deployedBytecode: compiledContract.evm.deployedBytecode.object,
    metadata: compiledContract.metadata
  };
  
  const outputPath = path.join(BUILD_DIR, `$${contractName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
  
  console.log(`✅ $${contractName} compiled successfully`.green);
  console.log(`   Output: $${outputPath}`.gray);
});

console.log('\n✨ Compilation complete!'.green.bold);
console.log(`📦 Artifacts saved to: $${BUILD_DIR}`.cyan);
"@ | Out-File -FilePath "scripts/compile.js" -Encoding utf8

# Create deploy.js
Write-Host "🚀 Creating scripts/deploy.js..." -ForegroundColor Yellow
@"
require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateFlow,
  Hbar
} = require('@hashgraph/sdk');
const fs = require('fs-extra');
const path = require('path');
const colors = require('colors');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const DEPLOYMENT_FILE = path.join(__dirname, '..', 'deployed-contracts.json');

// Get network from command line argument
const network = process.argv[2] || 'testnet';

console.log(`\n${'='.repeat(60)}`.cyan);
console.log(`🚀 Deploying AfriLend Contracts to Hedera $${network.toUpperCase()}`.cyan.bold);
console.log(`${'='.repeat(60)}\n`.cyan);

// Load environment variables
const envFile = network === 'mainnet' ? '.env.mainnet' : '.env.testnet';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

// Validate environment variables
if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_PRIVATE_KEY) {
  console.error('❌ Error: Missing required environment variables'.red.bold);
  console.error(`   Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_PRIVATE_KEY in $${envFile}\n`.red);
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
const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_PRIVATE_KEY);

client.setOperator(operatorId, operatorKey);

console.log(`👤 Operator Account: $${operatorId.toString()}`.gray);

// Deployment configuration
const MAX_GAS = parseInt(process.env.MAX_GAS) || 2000000;

async function getAccountBalance() {
  const balance = await client.getAccountBalance(operatorId);
  return balance.hbars.toString();
}

async function deployContract(contractName, constructorParams = null) {
  console.log(`\n${'─'.repeat(60)}`.gray);
  console.log(`📄 Deploying $${contractName}...`.yellow.bold);
  
  try {
    // Load compiled contract
    const artifactPath = path.join(BUILD_DIR, `$${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: $${artifactPath}. Run 'npm run compile' first.`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode;
    
    if (!bytecode || bytecode === '0x') {
      throw new Error(`Invalid bytecode for $${contractName}`);
    }
    
    console.log(`   Bytecode size: $${(bytecode.length / 2).toLocaleString()} bytes`.gray);
    
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
    
    console.log(`   ✅ $${contractName} deployed successfully!`.green.bold);
    console.log(`   📋 Contract ID: $${contractId.toString()}`.green);
    console.log(`   🔗 Transaction ID: $${txResponse.transactionId.toString()}`.gray);
    
    // Explorer link
    const explorerUrl = network === 'mainnet' 
      ? `https://hashscan.io/mainnet/contract/$${contractId.toString()}`
      : `https://hashscan.io/testnet/contract/$${contractId.toString()}`;
    console.log(`   🌐 Explorer: $${explorerUrl}`.cyan);
    
    return {
      contractId: contractId.toString(),
      transactionId: txResponse.transactionId.toString(),
      timestamp: new Date().toISOString(),
      explorerUrl: explorerUrl
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to deploy $${contractName}:`.red.bold);
    console.error(`   $${error.message}`.red);
    throw error;
  }
}

async function main() {
  try {
    // Check initial balance
    const initialBalance = await getAccountBalance();
    console.log(`\n💰 Account Balance: $${initialBalance}\n`.cyan);
    
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
      console.log(`   $${name}: $${info.contractId}`.green);
    });
    
    const finalBalance = await getAccountBalance();
    console.log(`\n💰 Final Balance: $${finalBalance}`.cyan);
    console.log(`💸 Deployment Cost: ~$${(parseFloat(initialBalance) - parseFloat(finalBalance)).toFixed(2)} HBAR`.gray);
    
    console.log(`\n📄 Deployment details saved to: $${DEPLOYMENT_FILE}`.gray);
    
    console.log('\n⚠️  IMPORTANT: Update your server/.env file with these contract IDs:'.yellow.bold);
    console.log(`\nHEDERA_NETWORK=$${network}`.yellow);
    console.log(`HEDERA_OPERATOR_ID=$${operatorId.toString()}`.yellow);
    console.log(`HEDERA_OPERATOR_PRIVATE_KEY=$${process.env.HEDERA_OPERATOR_PRIVATE_KEY}`.yellow);
    console.log(`AFRILEND_LOAN_MANAGER_CONTRACT=$${deployedContracts.AfriLendLoanManager.contractId}`.yellow);
    console.log(`LENDER_POOL_CONTRACT=$${deployedContracts.LenderPool.contractId}`.yellow);
    console.log(`REPUTATION_CONTRACT=$${deployedContracts.Reputation.contractId}\n`.yellow);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:'.red.bold);
    console.error(error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
"@ | Out-File -FilePath "scripts/deploy.js" -Encoding utf8

# Create verify.js
Write-Host "✅ Creating scripts/verify.js..." -ForegroundColor Yellow
@"
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
const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_PRIVATE_KEY);

client.setOperator(operatorId, operatorKey);

async function verifyContract(contractName, contractId) {
  console.log(`Verifying $${contractName} ($${contractId})...`.yellow);
  
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
    
    console.log(`✅ $${contractName} is active and accessible`.green);
    
    const explorerUrl = network === 'mainnet' 
      ? `https://hashscan.io/mainnet/contract/$${contractId}`
      : `https://hashscan.io/testnet/contract/$${contractId}`;
    console.log(`   🌐 View on HashScan: $${explorerUrl}\n`.cyan);
    
    return true;
  } catch (error) {
    console.error(`❌ $${contractName} verification failed: $${error.message}\n`.red);
    return false;
  }
}

async function main() {
  console.log('Deployment Information:'.cyan);
  console.log(`  Network: $${deployment.network}`.gray);
  console.log(`  Deployed: $${deployment.timestamp}`.gray);
  console.log(`  Operator: $${deployment.operator}\n`.gray);
  
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
"@ | Out-File -FilePath "scripts/verify.js" -Encoding utf8

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`n📦 Next steps:" -ForegroundColor Cyan
Write-Host "1. npm install" -ForegroundColor Yellow
Write-Host "2. npm run compile" -ForegroundColor Yellow
Write-Host "3. npm run deploy:testnet" -ForegroundColor Yellow
Write-Host "4. npm run verify" -ForegroundColor Yellow

Write-Host "`n🎉 Ready to deploy!" -ForegroundColor Green