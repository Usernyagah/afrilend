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
  let hasFatalError = false;
  output.errors.forEach(error => {
    // Ignore documentation errors, only fail on actual compilation errors
    if (error.severity === 'error' && error.type !== 'DocstringParsingError') {
      console.error(`❌ ${error.formattedMessage}`.red);
      hasFatalError = true;
    } else if (error.severity === 'error' && error.type === 'DocstringParsingError') {
      console.warn(`⚠️  ${error.formattedMessage}`.yellow);
    } else {
      console.warn(`⚠️  ${error.formattedMessage}`.yellow);
    }
  });
  
  if (hasFatalError) {
    console.error('\n❌ Compilation failed with errors.'.red.bold);
    process.exit(1);
  }
  
  if (output.errors.length > 0) {
    console.log('\n⚠️  Compilation completed with warnings (non-fatal)'.yellow);
  }
}

// Check if contracts were compiled
if (!output.contracts || Object.keys(output.contracts).length === 0) {
  console.error('\n❌ No contracts were compiled. This may be due to compilation errors.'.red.bold);
  console.error('Try fixing the Solidity code or documentation comments.'.red);
  process.exit(1);
}

// Save compiled contracts
contracts.forEach(contract => {
  const contractName = path.basename(contract, '.sol');
  
  // Check if this specific contract was compiled
  if (!output.contracts[contract] || !output.contracts[contract][contractName]) {
    console.error(`❌ Failed to compile ${contractName} - contract output not found`.red);
    return;
  }
  
  const compiledContract = output.contracts[contract][contractName];
  
  if (!compiledContract) {
    console.error(`❌ Failed to compile ${contractName}`.red);
    return;
  }
  
  const artifact = {
    contractName: contractName,
    abi: compiledContract.abi,
    bytecode: compiledContract.evm.bytecode.object,
    deployedBytecode: compiledContract.evm.deployedBytecode.object,
    metadata: compiledContract.metadata
  };
  
  const outputPath = path.join(BUILD_DIR, `${contractName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
  
  console.log(`✅ ${contractName} compiled successfully`.green);
  console.log(`   Output: ${outputPath}`.gray);
});

console.log('\n✨ Compilation complete!'.green.bold);
console.log(`📦 Artifacts saved to: ${BUILD_DIR}`.cyan);
