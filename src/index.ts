import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { initDatabase } from './database';
import { setupCommandHandlers } from './commands';
import { startScoreTracking } from './services/trackingService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const TELEGRAM_TOKEN: string = process.env.TELEGRAM_TOKEN || '';

if (!TELEGRAM_TOKEN) {
  logger.error('TELEGRAM_TOKEN is not defined in environment variables');
  process.exit(1);
}

async function main() {
  try {
    // Initialize database
    await initDatabase();

    // Create a bot instance
    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    logger.info('Bot started successfully');

    // Setup command handlers
    setupCommandHandlers(bot);

    // Start tracking service
    startScoreTracking(bot);
  } catch (error) {
    logger.error('Failed to start the bot:', error);
    process.exit(1);
  }
}

main();