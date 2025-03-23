import TelegramBot from 'node-telegram-bot-api';
import { getAllTrackedUsers, updateUserScore } from '../database';
import { getYapsScore, YapsScore } from './kaitoApi';
import { logger } from '../utils/logger';
import { formatScoreChange } from '../utils/formatters';

import dotenv from 'dotenv';
dotenv.config();

// Get check interval from env or use default (60 minutes)
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '60', 10);
const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000; // Convert minutes to milliseconds

// Flag to track if a checking process is already running
let isCheckingInProgress = false;
let isServiceActive = false;

export function startScoreTracking(bot: TelegramBot): void {
  if (isServiceActive) {
    logger.warn('Score tracking service is already running');
    return;
  }
  
  isServiceActive = true;
  logger.info(`Score tracking service started (interval: ${CHECK_INTERVAL_MINUTES} minutes)`);
  
  // Start the tracking immediately
  scheduleNextCheck(bot);
}

// Function to schedule the next check
function scheduleNextCheck(bot: TelegramBot): void {
  if (!isServiceActive) return;
  
  setTimeout(async () => {
    // Only proceed if no other checking is in progress
    if (!isCheckingInProgress) {
      try {
        isCheckingInProgress = true;
        await trackScores(bot);
      } catch (error) {
        logger.error('Error in tracking scores:', error);
      } finally {
        isCheckingInProgress = false;
        // Schedule the next check only after the current one completes
        scheduleNextCheck(bot);
      }
    } else {
      logger.warn('Previous check still in progress, skipping this cycle');
      // Re-schedule anyway to ensure we don't stop checking
      scheduleNextCheck(bot);
    }
  }, CHECK_INTERVAL_MS);
}

// Stop the tracking service gracefully
export function stopScoreTracking(): void {
  isServiceActive = false;
  logger.info('Score tracking service stopped');
}

async function trackScores(bot: TelegramBot): Promise<void> {
  try {
    const startTime = Date.now();
    const trackedUsers = await getAllTrackedUsers();
    logger.info(`Checking scores for ${trackedUsers.length} tracked Twitter users`);

    // Process users in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds between requests
    
    for (let i = 0; i < trackedUsers.length; i += BATCH_SIZE) {
      const batch = trackedUsers.slice(i, i + BATCH_SIZE);
      
      // Process batch with proper rate limiting
      await Promise.all(batch.map(async (user) => {
        try {
          await processUser(bot, user);
        } catch (userError) {
          logger.error(`Error processing user ${user.twitter_username}:`, userError);
          // Continue with other users
        }
      }));
      
      // Wait between batches if not the last batch
      if (i + BATCH_SIZE < trackedUsers.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Completed checking scores for ${trackedUsers.length} users in ${duration.toFixed(2)} seconds`);
  } catch (error) {
    logger.error('Error in score tracking service:', error);
  }
}

async function processUser(bot: TelegramBot, user: { chat_id: number; twitter_username: string; last_score_data: YapsScore }): Promise<void> {
  const { chat_id, twitter_username, last_score_data } = user;
  
  const currentScoreData = await getYapsScore(twitter_username);
  if (!currentScoreData) {
    logger.warn(`Could not fetch data for user ${twitter_username}`);
    return;
  }
  
  // Check if total score has increased
  if (currentScoreData.yaps_all > last_score_data.yaps_all) {
    // Generate message with detailed score changes
    const message = formatScoreChange(twitter_username, currentScoreData, last_score_data);
    
    // Send notification to the user
    await bot.sendMessage(chat_id, message, { parse_mode: 'Markdown' });
    
    // Update the score data in the database
    await updateUserScore(chat_id, twitter_username, currentScoreData);
    
    logger.info(`Updated score for ${twitter_username}: ${last_score_data.yaps_all.toFixed(2)} -> ${currentScoreData.yaps_all.toFixed(2)}`);
  }
  // else{
  //   logger.info(`No change in score for ${twitter_username}`);
  // }
}