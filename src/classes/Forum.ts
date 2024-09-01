import { DEFAULT_FORUM_URL } from "../vars.js";
/**
 * Classes dont les instances représentent des forums. L'initialisation se fait de la manière suivante :
 * var forum = await Forum.create(<id>);
 * 
 * @class
 * @name Forum
 * @kind class
 */
class Forum {
    private _id: number;
    private _url: string;

    constructor(forumId: number, url: string) {
        this._id = forumId;
        this._url = url;
    }

    /**
     * Renvoie un nouvel objet Forum à partir de l'ID du forum.
     * 
     * @async
     * @method
     * @name create
     * @kind method
     * @memberof Forum
     * @static
     * @param {number} forumId
     * @returns {Promise<Forum>}
     */
    static async create(forumId: number): Promise<Forum> {
        const url = await Forum.getForumURL(forumId);
        return new Forum(forumId, url);
    }

    get url(): string {
        return this._url;
    }

    get id(): number {
        return this._id;
    }

    static async getForumURL(forumId: number): Promise<string> {
        try {
            const response = await fetch(`https://www.jeuxvideo.com/forums/0-${forumId}-0-1-0-1-0-a.htm`, { method: 'GET' });
            return response.url;
        } catch (error: any) {
            console.error('Failed to get forum URL:', error.message);
            return '';
        }
    }

    async doesForumExist(): Promise<boolean> {
        try {
            if (this._url === '') {
                return false;
            }
            const response = await fetch(this._url, { method: 'GET' });
            return response.url != DEFAULT_FORUM_URL; // si le forum n'existe pas JVC redirige vers DEFAULT_FORUM_URL
        } catch (error: any) {
            console.error('Failed to check if forum exists:', error.message);
            return false;
        }
    }
}

export default Forum;