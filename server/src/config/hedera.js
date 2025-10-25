const { Client, AccountId, PrivateKey, ContractCreateFlow, ContractCallQuery, ContractExecuteTransaction } = require('@hashgraph/sdk');
const logger = require('../utils/logger');

let client;
let operatorAccountId;
let operatorPrivateKey;

/**
 * Initialize Hedera SDK client
 */
const initializeHedera = () => {
  try {
    // Get network configuration
    const network = process.env.HEDERA_NETWORK || 'testnet';
    
    // Initialize client based on network
    if (network === 'mainnet') {
      client = Client.forMainnet();
    } else {
      client = Client.forTestnet();
    }

    // Set operator account
    operatorAccountId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    operatorPrivateKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_PRIVATE_KEY);

    client.setOperator(operatorAccountId, operatorPrivateKey);

    logger.info(`✅ Hedera SDK initialized for ${network}`);
    logger.info(`📋 Operator Account: ${operatorAccountId.toString()}`);
    
    return client;
  } catch (error) {
    logger.error('❌ Failed to initialize Hedera SDK:', error);
    throw error;
  }
};

/**
 * Get Hedera client instance
 */
const getHederaClient = () => {
  if (!client) {
    throw new Error('Hedera client not initialized. Call initializeHedera() first.');
  }
  return client;
};

/**
 * Get operator account ID
 */
const getOperatorAccountId = () => {
  if (!operatorAccountId) {
    throw new Error('Operator account not initialized.');
  }
  return operatorAccountId;
};

/**
 * Get operator private key
 */
const getOperatorPrivateKey = () => {
  if (!operatorPrivateKey) {
    throw new Error('Operator private key not initialized.');
  }
  return operatorPrivateKey;
};

/**
 * Deploy smart contract
 */
const deployContract = async (bytecode, constructorParameters = []) => {
  try {
    const hederaClient = getHederaClient();
    
    const contractCreateFlow = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setConstructorParameters(constructorParameters)
      .setGas(1000000);

    const contractCreateResponse = await contractCreateFlow.execute(hederaClient);
    const contractCreateReceipt = await contractCreateResponse.getReceipt(hederaClient);
    
    const contractId = contractCreateReceipt.contractId;
    
    logger.info(`✅ Contract deployed successfully: ${contractId.toString()}`);
    return contractId;
  } catch (error) {
    logger.error('❌ Failed to deploy contract:', error);
    throw error;
  }
};

/**
 * Call smart contract function (read-only)
 */
const callContractFunction = async (contractId, functionName, parameters = []) => {
  try {
    const hederaClient = getHederaClient();
    
    const contractCallQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction(functionName, parameters);

    const contractCallResponse = await contractCallQuery.execute(hederaClient);
    
    logger.info(`✅ Contract function ${functionName} called successfully`);
    return contractCallResponse;
  } catch (error) {
    logger.error(`❌ Failed to call contract function ${functionName}:`, error);
    throw error;
  }
};

/**
 * Execute smart contract function (state-changing)
 */
const executeContractFunction = async (contractId, functionName, parameters = [], gas = 100000) => {
  try {
    const hederaClient = getHederaClient();
    
    const contractExecuteTransaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gas)
      .setFunction(functionName, parameters);

    const contractExecuteResponse = await contractExecuteTransaction.execute(hederaClient);
    const contractExecuteReceipt = await contractExecuteResponse.getReceipt(hederaClient);
    
    logger.info(`✅ Contract function ${functionName} executed successfully`);
    return {
      response: contractExecuteResponse,
      receipt: contractExecuteReceipt
    };
  } catch (error) {
    logger.error(`❌ Failed to execute contract function ${functionName}:`, error);
    throw error;
  }
};

/**
 * Get account balance
 */
const getAccountBalance = async (accountId) => {
  try {
    const hederaClient = getHederaClient();
    const accountIdObj = AccountId.fromString(accountId);
    
    const balance = await hederaClient.getAccountBalance(accountIdObj);
    
    logger.info(`💰 Account ${accountId} balance: ${balance.toString()} tinybars`);
    return balance;
  } catch (error) {
    logger.error(`❌ Failed to get account balance for ${accountId}:`, error);
    throw error;
  }
};

/**
 * Convert tinybars to HBAR
 */
const tinybarsToHbar = (tinybars) => {
  return tinybars / 100000000; // 1 HBAR = 100,000,000 tinybars
};

/**
 * Convert HBAR to tinybars
 */
const hbarToTinybars = (hbar) => {
  return Math.floor(hbar * 100000000);
};

/**
 * Get network information
 */
const getNetworkInfo = () => {
  const hederaClient = getHederaClient();
  return {
    network: process.env.HEDERA_NETWORK || 'testnet',
    operatorAccount: operatorAccountId?.toString(),
    nodeIds: hederaClient.network.getNodeAccountIds().map(id => id.toString())
  };
};

module.exports = {
  initializeHedera,
  getHederaClient,
  getOperatorAccountId,
  getOperatorPrivateKey,
  deployContract,
  callContractFunction,
  executeContractFunction,
  getAccountBalance,
  tinybarsToHbar,
  hbarToTinybars,
  getNetworkInfo
};
