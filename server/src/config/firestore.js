const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirestore = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // Initialize with service account key
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      logger.info('✅ Firebase Admin SDK initialized successfully');
    }

    db = admin.firestore();
    
    // Configure Firestore settings
    db.settings({
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true
    });

    logger.info('✅ Firestore database connected');
    return db;
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase:', error);
    throw error;
  }
};

/**
 * Get Firestore database instance
 */
const getFirestore = () => {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirestore() first.');
  }
  return db;
};

/**
 * Get Firestore collections
 */
const getCollections = () => {
  const firestore = getFirestore();
  return {
    users: firestore.collection('users'),
    loans: firestore.collection('loans'),
    pools: firestore.collection('pools'),
    transactions: firestore.collection('transactions'),
    notifications: firestore.collection('notifications'),
    reputation: firestore.collection('reputation')
  };
};

/**
 * Batch operations helper
 */
const createBatch = () => {
  return getFirestore().batch();
};

/**
 * Transaction helper
 */
const runTransaction = async (updateFunction) => {
  const firestore = getFirestore();
  return firestore.runTransaction(updateFunction);
};

/**
 * Collection reference helper
 */
const getCollectionRef = (collectionName) => {
  return getFirestore().collection(collectionName);
};

/**
 * Document reference helper
 */
const getDocRef = (collectionName, docId) => {
  return getFirestore().collection(collectionName).doc(docId);
};

module.exports = {
  initializeFirestore,
  getFirestore,
  getCollections,
  createBatch,
  runTransaction,
  getCollectionRef,
  getDocRef
};
