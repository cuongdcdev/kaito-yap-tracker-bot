import TelegramBot from 'node-telegram-bot-api';
import { trackUser, untrackUser, getTrackedUsersForChat } from './database';
import { getYapsScore, YapsScore } from './services/kaitoApi';
import { logger } from './utils/logger';
import { formatScoreMessage, formatListMessage, formatComparisonMessage } from './utils/formatters';

const helpMsg = '🤖 **Kaito Yaps Tracker Bot Help**\n\n' +
    'Available commands:\n\n' +
    '• `/scan <twitter_handle or URL>` - Check current Kaito Yaps\n' +
    '• `/track <twitter_handle or URL>` - Track a Twitter handle\n' +
    '• `/list` - Show all Twitter handles you\'re tracking\n' +
    '• `/stop <twitter_handle or URL>` - Stop tracking a handle\n' +
    '• `/compare <handle1> <handle2> ...` - Compare up to 4 accounts\n' +
    '• `/help` - Show this help message\n\n' +
    'You can provide Twitter handles in these formats:\n' +
    '- @username\n' +
    '- username\n' +
    '- https://twitter.com/username\n' +
    '- https://x.com/username\n' +
    '- https://twitter.com/username/status/1234567890\n' +
    '- https://x.com/username/status/1234567890\n\n' +
    'This bot will notify you when tracked users gain Yaps points!';

// Helper function to extract username from Twitter/X URLs
function extractTwitterUsername(input: string): string {
    // Remove @ if present
    let username = input.replace('@', '');

    // Check for Twitter/X URLs
    const twitterUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)(?:\/status\/\d+|\/replies|\/)?/;
    const match = username.match(twitterUrlRegex);

    if (match && match[1]) {
        // Extract username from URL
        username = match[1];
    }

    return username;
}

// Helper function to get X/Twitter profile URL
function getTwitterProfileUrl(username: string): string {
    return `https://x.com/${username}`;
}

export function setupCommandHandlers(bot: TelegramBot): void {
    // Start command
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(
            chatId,
            '👋 Welcome to Kaito Yaps Tracker Bot!\n\n' +
            'Commands:\n' +
            '/scan <twitter_handle or URL> - Check Kaito Yaps\n' +
            '/track <twitter_handle or URL> - Track a Twitter handle for score updates\n' +
            '/list - List all handles you are tracking\n' +
            '/stop <twitter_handle or URL> - Stop tracking a handle\n' +
            '/compare <handle1> <handle2> ... - Compare up to 4 accounts\n\n' +
            'You can use Twitter/X usernames or URLs like:\n' +
            '- @username\n' +
            '- https://twitter.com/username\n' +
            '- https://x.com/username\n' +
            '- https://x.com/username/status/12345'
        );
    });

    // scan command - support for both direct username and URLs
    bot.onText(/\/scan (.+)/, async (msg, match) => {
        if (!match) return;

        const chatId = msg.chat.id;
        const input = match[1].trim();
        const twitterHandle = extractTwitterUsername(input);
        const profileUrl = getTwitterProfileUrl(twitterHandle);

        await bot.sendMessage(chatId, `🔍 Looking up Kaito Yaps for [@${twitterHandle}](${profileUrl})...`, { parse_mode: 'Markdown' });

        try {
            const score = await getYapsScore(twitterHandle);

            if (score) {
                await bot.sendMessage(
                    chatId,
                    formatScoreMessage(score, profileUrl),
                    { parse_mode: 'Markdown' }
                );
            } else {
                await bot.sendMessage(
                    chatId,
                    `❌ Couldn't find Kaito Yaps for [@${twitterHandle}](${profileUrl}). Make sure the Twitter handle is correct.`,
                    { parse_mode: 'Markdown' }
                );
            }
        } catch (error) {
            logger.error(`Error processing /scan for ${twitterHandle}:`, error);
            await bot.sendMessage(
                chatId,
                `❌ An error occurred while fetching data for [@${twitterHandle}](${profileUrl})`,
                { parse_mode: 'Markdown' }
            );
        }
    });

    // Compare command - compare multiple Twitter accounts
    bot.onText(/\/compare (.+)/, async (msg, match) => {
        if (!match) return;

        const chatId = msg.chat.id;
        const input = match[1].trim();
        
        // Split by spaces to get multiple handles
        const handles = input.split(/\s+/).slice(0, 4); // Limit to 4 accounts
        
        if (handles.length < 2) {
            await bot.sendMessage(
                chatId,
                '⚠️ Please provide at least 2 accounts to compare.\n' +
                'Example: `/compare user1 user2 user3 user4`',
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        await bot.sendMessage(
            chatId,
            `🔍 Comparing Kaito Yaps for ${handles.length} accounts...`,
            { parse_mode: 'Markdown' }
        );
        
        try {
            // Array to store score results
            const scoreResults: Array<{
                username: string;
                score: YapsScore;
                profileUrl: string;
            }> = [];
            
            // Fetch data for each handle
            for (const handle of handles) {
                const twitterHandle = extractTwitterUsername(handle);
                const profileUrl = getTwitterProfileUrl(twitterHandle);
                
                const score = await getYapsScore(twitterHandle);
                
                if (score) {
                    scoreResults.push({
                        username: twitterHandle,
                        score,
                        profileUrl
                    });
                } else {
                    await bot.sendMessage(
                        chatId,
                        `⚠️ Couldn't find data for [@${twitterHandle}](${profileUrl})`,
                        { parse_mode: 'Markdown' }
                    );
                }
            }
            
            if (scoreResults.length > 0) {
                // Sort by last 24 hours Yaps (highest first)
                scoreResults.sort((a, b) => b.score.yaps_l24h - a.score.yaps_l24h);
                
                // Format and send the comparison message
                await bot.sendMessage(
                    chatId,
                    formatComparisonMessage(scoreResults),
                    { parse_mode: 'Markdown' }
                );
            } else {
                await bot.sendMessage(
                    chatId,
                    '❌ Couldn\'t find data for any of the provided accounts.'
                );
            }
        } catch (error) {
            logger.error(`Error processing /compare command:`, error);
            await bot.sendMessage(
                chatId,
                '❌ An error occurred while comparing the accounts.'
            );
        }
    });

    // Track command - support for both direct username and URLs
    bot.onText(/\/track (.+)/, async (msg, match) => {
        if (!match) return;

        const chatId = msg.chat.id;
        const input = match[1].trim();
        const twitterHandle = extractTwitterUsername(input);
        const profileUrl = getTwitterProfileUrl(twitterHandle);

        await bot.sendMessage(chatId, `🔄 Processing tracking request for [@${twitterHandle}](${profileUrl})...`, { parse_mode: 'Markdown' });

        try {
            const score = await getYapsScore(twitterHandle);

            if (score) {
                await trackUser(chatId, twitterHandle, score);
                await bot.sendMessage(
                    chatId,
                    `✅ [@${twitterHandle}](${profileUrl}) is now being tracked.\n` +
                    `You'll receive updates when their Yaps increases.\n\n` +
                    `Current score: ${score.yaps_all.toFixed(2)}`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await bot.sendMessage(
                    chatId,
                    `❌ Couldn't find Kaito Yaps for [@${twitterHandle}](${profileUrl}). Make sure the Twitter handle is correct.`,
                    { parse_mode: 'Markdown' }
                );
            }
        } catch (error) {
            logger.error(`Error processing /track for ${twitterHandle}:`, error);
            await bot.sendMessage(
                chatId,
                `❌ An error occurred while setting up tracking for [@${twitterHandle}](${profileUrl})`,
                { parse_mode: 'Markdown' }
            );
        }
    });

    // List command
    bot.onText(/\/list/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const trackedUsers = await getTrackedUsersForChat(chatId);

            if (trackedUsers.length > 0) {
                await bot.sendMessage(
                    chatId,
                    formatListMessage(trackedUsers),
                    { parse_mode: 'Markdown' }
                );
            } else {
                await bot.sendMessage(
                    chatId,
                    '📋 You are not tracking any Twitter handles yet.\n\n' +
                    'Use /track <twitter_handle> to start tracking someone.'
                );
            }
        } catch (error) {
            logger.error(`Error processing /list for chat ${chatId}:`, error);
            await bot.sendMessage(
                chatId,
                '❌ An error occurred while retrieving your tracked users.'
            );
        }
    });

    // Unsubscribe command - support for both direct username and URLs
    bot.onText(/\/stop (.+)/, async (msg, match) => {
        if (!match) return;

        const chatId = msg.chat.id;
        const input = match[1].trim();
        const twitterHandle = extractTwitterUsername(input);
        const profileUrl = getTwitterProfileUrl(twitterHandle);

        try {
            const removed = await untrackUser(chatId, twitterHandle);

            if (removed) {
                await bot.sendMessage(
                    chatId,
                    `❌ You have unsubscribed from [@${twitterHandle}](${profileUrl}) updates.`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await bot.sendMessage(
                    chatId,
                    `⚠️ You were not tracking [@${twitterHandle}](${profileUrl}).`,
                    { parse_mode: 'Markdown' }
                );
            }
        } catch (error) {
            logger.error(`Error processing /stop for ${twitterHandle}:`, error);
            await bot.sendMessage(
                chatId,
                `❌ An error occurred while unsubscribing from [@${twitterHandle}](${profileUrl})`,
                { parse_mode: 'Markdown' }
            );
        }
    });

    // Help command
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(
            chatId,
            helpMsg,
            { parse_mode: 'Markdown' }
        );
    });

    // Handle unknown commands
    bot.on('message', (msg) => {
        if (!msg.text || !msg.text.startsWith('/')) {
            bot.sendMessage(msg.chat.id, '❓ Unknown command \n\n ' + helpMsg, {
                parse_mode: 'Markdown'
            });
            return;
        };

        // Check if the message is one of the known commands
        const knownCommands = ['/start', '/scan', '/track', '/list', '/stop', '/help', '/compare'];
        const isKnownCommand = knownCommands.some(cmd => msg.text?.startsWith(cmd));

        if (!isKnownCommand && msg.text.startsWith('/')) {
            bot.sendMessage(
                msg.chat.id,
                '❓ Unknown command. Use /help to see available commands.'
            );
        }
    });
}