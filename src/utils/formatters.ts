import { YapsScore } from '../services/kaitoApi';

// Helper function to get X/Twitter profile URL
function getTwitterProfileUrl(username: string): string {
  return `https://x.com/${username}`;
}

export function formatScoreMessage(score: YapsScore, profileUrl?: string): string {
  const url = profileUrl || getTwitterProfileUrl(score.username);
  
return `📊 Kaito Yaps for **[@${score.username}](${url})** \n\n` +
    `• Total: ${score.yaps_all.toFixed(2)}\n` +
    `• Last 24h: ${score.yaps_l24h.toFixed(2)}\n\n` +
    `🔎 *More details:*\n` +
    `• Last 7d: ${score.yaps_l7d.toFixed(2)}\n` +
    `• Last 30d: ${score.yaps_l30d.toFixed(2)}\n` +
    `• Last 3m: ${score.yaps_l3m.toFixed(2)}\n` +
    `• Last 6m: ${score.yaps_l6m.toFixed(2)}\n` +
    `• Last 12m: ${score.yaps_l12m.toFixed(2)}`;
}

export function formatListMessage(trackedUsers: { twitter_username: string; last_score_data: YapsScore }[]): string {
  const header = '📋 *Your tracked Twitter handles:*\n\n';
  
  const userList = trackedUsers
    .map(user => {
      const profileUrl = getTwitterProfileUrl(user.twitter_username);
      return `• [@${user.twitter_username}](${profileUrl}) - ${user.last_score_data.yaps_all.toFixed(2)} Yaps`;
    })
    .join('\n');
  
  return header + userList;
}

export function formatScoreChange(
  twitterUsername: string,
  currentScore: YapsScore,
  previousScore: YapsScore
): string {
  const totalIncrease = currentScore.yaps_all - previousScore.yaps_all;
  const percentIncrease = (totalIncrease / previousScore.yaps_all) * 100;
  const profileUrl = getTwitterProfileUrl(twitterUsername);
  
  let message = `🚀 [@${twitterUsername}](${profileUrl}) gained Yaps!\n\n`;
  
  // Add total score increase
  message += `*Total increase:* +${totalIncrease.toFixed(2)} Yaps (↑${percentIncrease.toFixed(2)}%)\n`;
  message += `*Current Yaps:* ${currentScore.yaps_all.toFixed(2)} Yaps\n\n`;
  
  // Add breakdown of where the points came from (which time period)
  message += "*Breakdown by time period:*\n";
  
  if (currentScore.yaps_l24h > 0) {
    message += `• Last 24h: +${currentScore.yaps_l24h.toFixed(2)}\n`;
  }
  
  if (currentScore.yaps_l7d > previousScore.yaps_l7d) {
    const diff = currentScore.yaps_l7d - previousScore.yaps_l7d;
    message += `• Last 7d: +${diff.toFixed(2)}\n`;
  }
  
  if (currentScore.yaps_l30d > previousScore.yaps_l30d) {
    const diff = currentScore.yaps_l30d - previousScore.yaps_l30d;
    message += `• Last 30d: +${diff.toFixed(2)}\n`;
  }
  
  return message;
}

// New function to format comparison messages
export function formatComparisonMessage(
  results: Array<{ username: string; score: YapsScore; profileUrl: string }>
): string {
  // Create header with medal emojis based on 24h performance
  const medals = ['🥇', '🥈', '🥉', '4️⃣'];
  
  let message = `🏆 *Kaito Yaps Comparison (Last 24h)*\n\n`;
  
  // Create a table-like comparison
  results.forEach((result, index) => {
    const medal = index < medals.length ? medals[index] : `${index+1}`;
    const { username, score, profileUrl } = result;
    
    message += `${medal} [@${username}](${profileUrl})\n`;
    message += `   • Last 24h: ${score.yaps_l24h.toFixed(2)}\n`;
    message += `   • Total: ${score.yaps_all.toFixed(2)}\n`;
    
    // Add separator between users except for the last one
    if (index < results.length - 1) {
      message += `\n`;
    }
  });
  
  return message;
}