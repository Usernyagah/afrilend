const { ContractCallQuery, ContractExecuteTransaction } = require('@hashgraph/sdk');
const logger = require('./logger');

/**
 * Event listener for Hedera smart contract events
 */
class HederaEventListener {
  constructor(hederaClient, contractId) {
    this.client = hederaClient;
    this.contractId = contractId;
    this.listeners = new Map();
    this.isListening = false;
  }

  /**
   * Add event listener for specific event type
   */
  addEventListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Start listening for events
   */
  async startListening() {
    if (this.isListening) {
      logger.warn('Event listener is already running');
      return;
    }

    this.isListening = true;
    logger.info('🎧 Started listening for Hedera contract events');

    // Poll for events every 5 seconds
    this.pollInterval = setInterval(async () => {
      try {
        await this.pollForEvents();
      } catch (error) {
        logger.error('Error polling for events:', error);
      }
    }, 5000);
  }

  /**
   * Stop listening for events
   */
  stopListening() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isListening = false;
    logger.info('🛑 Stopped listening for Hedera contract events');
  }

  /**
   * Poll for new events
   */
  async pollForEvents() {
    try {
      // Get latest events from contract
      const events = await this.getContractEvents();
      
      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      logger.error('Error polling for events:', error);
    }
  }

  /**
   * Get contract events
   */
  async getContractEvents() {
    try {
      // This is a simplified implementation
      // In a real scenario, you would query the Hedera network for events
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      logger.error('Error getting contract events:', error);
      return [];
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    try {
      const eventType = event.type;
      
      if (this.listeners.has(eventType)) {
        const callbacks = this.listeners.get(eventType);
        for (const callback of callbacks) {
          try {
            await callback(event);
          } catch (error) {
            logger.error(`Error in event callback for ${eventType}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing event:', error);
    }
  }
}

/**
 * Event types for AfriLend contracts
 */
const EVENT_TYPES = {
  LOAN_CREATED: 'LoanCreated',
  LOAN_FUNDED: 'LoanFunded',
  LOAN_REPAID: 'LoanRepaid',
  LOAN_DEFAULTED: 'LoanDefaulted',
  POOL_CREATED: 'PoolCreated',
  LIQUIDITY_ADDED: 'LiquidityAdded',
  LIQUIDITY_REMOVED: 'LiquidityRemoved',
  YIELD_DISTRIBUTED: 'YieldDistributed',
  REPUTATION_UPDATED: 'ReputationUpdated',
  TRUST_LEVEL_CHANGED: 'TrustLevelChanged'
};

/**
 * Event listener instance for AfriLend contracts
 */
let eventListener = null;

/**
 * Initialize event listener
 */
const initializeEventListener = (hederaClient, contractId) => {
  eventListener = new HederaEventListener(hederaClient, contractId);
  return eventListener;
};

/**
 * Get event listener instance
 */
const getEventListener = () => {
  if (!eventListener) {
    throw new Error('Event listener not initialized');
  }
  return eventListener;
};

/**
 * Start listening for AfriLend events
 */
const startEventListening = async () => {
  try {
    const listener = getEventListener();
    await listener.startListening();
    logger.info('✅ AfriLend event listening started');
  } catch (error) {
    logger.error('❌ Failed to start event listening:', error);
    throw error;
  }
};

/**
 * Stop listening for AfriLend events
 */
const stopEventListening = () => {
  try {
    const listener = getEventListener();
    listener.stopListening();
    logger.info('✅ AfriLend event listening stopped');
  } catch (error) {
    logger.error('❌ Failed to stop event listening:', error);
    throw error;
  }
};

/**
 * Add event handler for loan events
 */
const addLoanEventHandler = (callback) => {
  const listener = getEventListener();
  listener.addEventListener(EVENT_TYPES.LOAN_CREATED, callback);
  listener.addEventListener(EVENT_TYPES.LOAN_FUNDED, callback);
  listener.addEventListener(EVENT_TYPES.LOAN_REPAID, callback);
  listener.addEventListener(EVENT_TYPES.LOAN_DEFAULTED, callback);
};

/**
 * Add event handler for pool events
 */
const addPoolEventHandler = (callback) => {
  const listener = getEventListener();
  listener.addEventListener(EVENT_TYPES.POOL_CREATED, callback);
  listener.addEventListener(EVENT_TYPES.LIQUIDITY_ADDED, callback);
  listener.addEventListener(EVENT_TYPES.LIQUIDITY_REMOVED, callback);
  listener.addEventListener(EVENT_TYPES.YIELD_DISTRIBUTED, callback);
};

/**
 * Add event handler for reputation events
 */
const addReputationEventHandler = (callback) => {
  const listener = getEventListener();
  listener.addEventListener(EVENT_TYPES.REPUTATION_UPDATED, callback);
  listener.addEventListener(EVENT_TYPES.TRUST_LEVEL_CHANGED, callback);
};

/**
 * Process loan events
 */
const processLoanEvent = async (event) => {
  try {
    logger.info(`📋 Processing loan event: ${event.type}`, event);
    
    // Update database based on event type
    switch (event.type) {
      case EVENT_TYPES.LOAN_CREATED:
        await handleLoanCreated(event);
        break;
      case EVENT_TYPES.LOAN_FUNDED:
        await handleLoanFunded(event);
        break;
      case EVENT_TYPES.LOAN_REPAID:
        await handleLoanRepaid(event);
        break;
      case EVENT_TYPES.LOAN_DEFAULTED:
        await handleLoanDefaulted(event);
        break;
      default:
        logger.warn(`Unknown loan event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('Error processing loan event:', error);
  }
};

/**
 * Handle loan created event
 */
const handleLoanCreated = async (event) => {
  // Update loan status in database
  logger.info(`🆕 Loan created: ${event.loanId}`);
};

/**
 * Handle loan funded event
 */
const handleLoanFunded = async (event) => {
  // Update loan funding status in database
  logger.info(`💰 Loan funded: ${event.loanId} by ${event.lender}`);
};

/**
 * Handle loan repaid event
 */
const handleLoanRepaid = async (event) => {
  // Update loan repayment status in database
  logger.info(`✅ Loan repaid: ${event.loanId}`);
};

/**
 * Handle loan defaulted event
 */
const handleLoanDefaulted = async (event) => {
  // Update loan default status in database
  logger.info(`❌ Loan defaulted: ${event.loanId}`);
};

module.exports = {
  HederaEventListener,
  EVENT_TYPES,
  initializeEventListener,
  getEventListener,
  startEventListening,
  stopEventListening,
  addLoanEventHandler,
  addPoolEventHandler,
  addReputationEventHandler,
  processLoanEvent
};
