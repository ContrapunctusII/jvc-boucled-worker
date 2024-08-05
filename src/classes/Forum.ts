import axios from 'axios';

const DEFAULT_FORUM_URL = 'https://www.jeuxvideo.com/forums.htm';

/**
 * Classes dont les instances représentent des forums. L'initialisation se fait de la manière suivante :
 * var forum = await Forum.create(<id>);
 * 
 * @class
 * @name Forum
 * @kind class
 */
class Forum {
    id: number;
    url: string;

    constructor(forumId: number, url: string) {
        this.id = forumId;
        this.url = url;
    }

    static async create(forumId: number) : Promise<Forum> {
        const url = await Forum.getForumURL(forumId);
        return new Forum(forumId, url);
    }

    getURL() : string {
        return this.url;
    }

    static async getForumURL(forumId: number) : Promise<string | null> {
        try {
            const response = await axios.get(`https://www.jeuxvideo.com/forums/0-${forumId}-0-1-0-1-0-a.htm`);
            return response.request.res.responseUrl;
        } catch (error) {
            console.error('Failed to get forum URL:', error.message);
            return null;
        }
    }

    async doesForumExist() : Promise<boolean> {
        try {
            const response = await axios.get(this.url);
            return response.request.res.responseUrl != DEFAULT_FORUM_URL;
        } catch (error) {
            console.error('Failed to check if forum exists:', error.message);
            return false;
        }
    }
}

export { Forum };
