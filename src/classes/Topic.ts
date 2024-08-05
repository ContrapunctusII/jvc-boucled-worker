import axios from 'axios';
import { logger } from './Logger.js';

/**
 * Classes dont les instances représentent des topics. L'initialisation se fait de la manière suivante :
 * var topic = await Topic.create(<id>);
 * 
 * @class
 * @name Forum
 * @kind class
 */
class Topic {
    id: number;
    url: string;

    constructor(topicId: number, url: string) {
        this.id = topicId;
        this.url = url;
    }

    getURL() : string {
        return this.url;
    }

    static async create(topicId: number) : Promise<Topic> {
        const url = await Topic.getTopicURL(topicId);
        return new Topic(topicId, url);
    }

    static async getTopicURL(topicId: number) : Promise<string | null> {
        try {
            const response = await axios.get(`https://www.jeuxvideo.com/forums/42-1-${topicId}-1-0-1-0-a.htm`);
            return response.request.res.responseUrl;
        } catch (error) {
            logger.error('Failed to get topic URL:', error.message);
            return null;
        }
    }

    static urlToId(topicUrl: string): number {
        return parseInt(topicUrl.split('-')[2]);
    }

    async doesTopicExist() : Promise<boolean> {
        try {
            const url = this.url;
            const response = await axios.get(url);
            return response.status === 200;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response && (error.response.status === 404 || error.response.status === 410)) {
                    return false;
                }
            }
            logger.error('Failed to check if topic exists:', error);
            return false;
        }
    }
}

export { Topic };
