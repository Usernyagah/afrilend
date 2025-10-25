const nodemailer = require('nodemailer');
const { getCollections } = require('../config/firestore');
const logger = require('../utils/logger');

/**
 * User service for business logic and external integrations
 */
class UserService {
  constructor() {
    this.emailTransporter = this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    try {
      return nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      return null;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user) {
    try {
      if (!this.emailTransporter) {
        logger.warn('Email transporter not initialized, skipping verification email');
        return;
      }

      const verificationToken = this.generateVerificationToken(user.id);
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'AfriLend <noreply@afrilend.com>',
        to: user.email,
        subject: 'Verify Your AfriLend Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to AfriLend!</h2>
            <p>Hi ${user.firstName},</p>
            <p>Thank you for registering with AfriLend. Please verify your email address to complete your registration.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The AfriLend Team</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    try {
      if (!this.emailTransporter) {
        logger.warn('Email transporter not initialized, skipping password reset email');
        return;
      }

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'AfriLend <noreply@afrilend.com>',
        to: user.email,
        subject: 'Reset Your AfriLend Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hi ${user.firstName},</p>
            <p>You requested to reset your password for your AfriLend account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The AfriLend Team</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(user, subject, message) {
    try {
      if (!this.emailTransporter) {
        logger.warn('Email transporter not initialized, skipping notification email');
        return;
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'AfriLend <noreply@afrilend.com>',
        to: user.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${subject}</h2>
            <p>Hi ${user.firstName},</p>
            <p>${message}</p>
            <p>Best regards,<br>The AfriLend Team</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Notification email sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send notification email:', error);
      throw error;
    }
  }

  /**
   * Generate verification token
   */
  generateVerificationToken(userId) {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userId, options = {}) {
    try {
      const { transactions } = getCollections();
      let query = transactions.where('userId', '==', userId).orderBy('createdAt', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const transactionsSnapshot = await query.get();
      return transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Failed to get user transactions:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { notifications } = getCollections();
      let query = notifications.where('userId', '==', userId).orderBy('createdAt', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const notificationsSnapshot = await query.get();
      return notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(userId, notificationId) {
    try {
      const { notifications } = getCollections();
      const notificationRef = notifications.doc(notificationId);
      
      const notificationDoc = await notificationRef.get();
      if (notificationDoc.exists && notificationDoc.data().userId === userId) {
        await notificationRef.update({
          isRead: true,
          readAt: new Date()
        });
      }
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Create notification
   */
  async createNotification(userId, type, title, message, metadata = {}) {
    try {
      const { notifications } = getCollections();
      const notificationRef = notifications.doc();
      
      const notification = {
        id: notificationRef.id,
        userId,
        type,
        title,
        message,
        metadata,
        isRead: false,
        createdAt: new Date()
      };

      await notificationRef.set(notification);
      logger.info(`Notification created for user ${userId}: ${title}`);
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Follow user
   */
  async followUser(followerId, followingId) {
    try {
      const { users } = getCollections();
      const followerRef = users.doc(followerId);
      const followingRef = users.doc(followingId);

      // Add to follower's following list
      const followerDoc = await followerRef.get();
      if (followerDoc.exists) {
        const follower = followerDoc.data();
        const following = follower.following || [];
        if (!following.includes(followingId)) {
          following.push(followingId);
          await followerRef.update({ following });
        }
      }

      // Add to following user's followers list
      const followingDoc = await followingRef.get();
      if (followingDoc.exists) {
        const following = followingDoc.data();
        const followers = following.followers || [];
        if (!followers.includes(followerId)) {
          followers.push(followerId);
          await followingRef.update({ followers });
        }
      }

      logger.info(`User ${followerId} followed ${followingId}`);
    } catch (error) {
      logger.error('Failed to follow user:', error);
      throw error;
    }
  }

  /**
   * Unfollow user
   */
  async unfollowUser(followerId, followingId) {
    try {
      const { users } = getCollections();
      const followerRef = users.doc(followerId);
      const followingRef = users.doc(followingId);

      // Remove from follower's following list
      const followerDoc = await followerRef.get();
      if (followerDoc.exists) {
        const follower = followerDoc.data();
        const following = follower.following || [];
        const updatedFollowing = following.filter(id => id !== followingId);
        await followerRef.update({ following: updatedFollowing });
      }

      // Remove from following user's followers list
      const followingDoc = await followingRef.get();
      if (followingDoc.exists) {
        const following = followingDoc.data();
        const followers = following.followers || [];
        const updatedFollowers = followers.filter(id => id !== followerId);
        await followingRef.update({ followers: updatedFollowers });
      }

      logger.info(`User ${followerId} unfollowed ${followingId}`);
    } catch (error) {
      logger.error('Failed to unfollow user:', error);
      throw error;
    }
  }

  /**
   * Get user followers
   */
  async getUserFollowers(userId, options = {}) {
    try {
      const { users } = getCollections();
      const userDoc = await users.doc(userId).get();
      
      if (!userDoc.exists) {
        return [];
      }

      const user = userDoc.data();
      const followers = user.followers || [];

      // Get follower details
      const followerDetails = await Promise.all(
        followers.map(async (followerId) => {
          const followerDoc = await users.doc(followerId).get();
          if (followerDoc.exists) {
            const follower = followerDoc.data();
            return {
              id: followerId,
              firstName: follower.firstName,
              lastName: follower.lastName,
              profileImage: follower.profileImage,
              isVerified: follower.isVerified
            };
          }
          return null;
        })
      );

      return followerDetails.filter(follower => follower !== null);
    } catch (error) {
      logger.error('Failed to get user followers:', error);
      throw error;
    }
  }

  /**
   * Get user following
   */
  async getUserFollowing(userId, options = {}) {
    try {
      const { users } = getCollections();
      const userDoc = await users.doc(userId).get();
      
      if (!userDoc.exists) {
        return [];
      }

      const user = userDoc.data();
      const following = user.following || [];

      // Get following details
      const followingDetails = await Promise.all(
        following.map(async (followingId) => {
          const followingDoc = await users.doc(followingId).get();
          if (followingDoc.exists) {
            const following = followingDoc.data();
            return {
              id: followingId,
              firstName: following.firstName,
              lastName: following.lastName,
              profileImage: following.profileImage,
              isVerified: following.isVerified
            };
          }
          return null;
        })
      );

      return followingDetails.filter(following => following !== null);
    } catch (error) {
      logger.error('Failed to get user following:', error);
      throw error;
    }
  }

  /**
   * Export user data
   */
  async exportUserData(userId) {
    try {
      const { users, loans, transactions, notifications } = getCollections();
      
      // Get user data
      const userDoc = await users.doc(userId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const user = userDoc.data();
      
      // Get user's loans
      const loansSnapshot = await loans.where('borrowerId', '==', userId).get();
      const userLoans = loansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get user's transactions
      const transactionsSnapshot = await transactions.where('userId', '==', userId).get();
      const userTransactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get user's notifications
      const notificationsSnapshot = await notifications.where('userId', '==', userId).get();
      const userNotifications = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        user: {
          ...user,
          password: undefined // Remove password from export
        },
        loans: userLoans,
        transactions: userTransactions,
        notifications: userNotifications,
        exportedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Update user reputation
   */
  async updateUserReputation(userId, action, metadata = {}) {
    try {
      const { reputation } = getCollections();
      const reputationRef = reputation.doc(userId);
      
      const reputationDoc = await reputationRef.get();
      let reputationData = reputationDoc.exists ? reputationDoc.data() : {
        score: 100,
        trustLevel: 'New',
        totalLoans: 0,
        successfulLoans: 0,
        defaultedLoans: 0,
        totalLent: 0,
        totalBorrowed: 0,
        lastUpdated: new Date()
      };

      // Update reputation based on action
      switch (action) {
        case 'successful_loan':
          reputationData.successfulLoans += 1;
          reputationData.totalLoans += 1;
          reputationData.totalBorrowed += metadata.amount || 0;
          reputationData.score += 50;
          break;
        case 'loan_default':
          reputationData.defaultedLoans += 1;
          reputationData.totalLoans += 1;
          reputationData.totalBorrowed += metadata.amount || 0;
          reputationData.score = Math.max(0, reputationData.score - 100);
          break;
        case 'lending':
          reputationData.totalLent += metadata.amount || 0;
          reputationData.score += 30;
          break;
        case 'on_time_repayment':
          reputationData.score += 25;
          break;
        case 'early_repayment':
          reputationData.score += 10;
          break;
        default:
          break;
      }

      // Update trust level based on score
      if (reputationData.score >= 1000) {
        reputationData.trustLevel = 'Premium';
      } else if (reputationData.score >= 601) {
        reputationData.trustLevel = 'Excellent';
      } else if (reputationData.score >= 301) {
        reputationData.trustLevel = 'Good';
      } else if (reputationData.score >= 101) {
        reputationData.trustLevel = 'Basic';
      } else {
        reputationData.trustLevel = 'New';
      }

      reputationData.lastUpdated = new Date();

      await reputationRef.set(reputationData);
      logger.info(`Reputation updated for user ${userId}: ${action}`);
    } catch (error) {
      logger.error('Failed to update user reputation:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
