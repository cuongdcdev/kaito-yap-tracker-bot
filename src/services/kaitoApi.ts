import axios from 'axios';
import { logger } from '../utils/logger';

export interface YapsScore {
  user_id: string;
  username: string;
  yaps_all: number;
  yaps_l24h: number;
  yaps_l48h: number;
  yaps_l7d: number;
  yaps_l30d: number;
  yaps_l3m: number;
  yaps_l6m: number;
  yaps_l12m: number;
}

const KAITO_API_URL = 'https://api.kaito.ai/api/v1/yaps';

export async function getYapsScore(twitterUsername: string): Promise<YapsScore | null> {
  try {
    const response = await axios.get(`${KAITO_API_URL}?username=${twitterUsername}`);
    return response.data as YapsScore;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        logger.warn(`Twitter user ${twitterUsername} not found on Kaito`);
        return null;
      }
      logger.error(`Error fetching Kaito data for ${twitterUsername}: ${error.message}`);
    } else {
      logger.error(`Unexpected error fetching Kaito data: ${error}`);
    }
    return null;
  }
}