/**
 * Classes dont les instances représentent des topics. L'initialisation se fait de la manière suivante :
 * var topic = await Topic.create(<id>);
 * 
 * @class
 * @name Forum
 * @kind class
 */
class Topic {
    private _id: number;
    private _url: string;

    constructor(topicId: number, url: string) {
        this._id = topicId;
        this._url = url;
    }

    get url(): string {
        return this._url;
    }

    get id(): number {
        return this._id;
    }

    /**
     * Crée un objet Topic à partir de l'ID donné en entrée.
     * 
     * @async
     * @method
     * @name create
     * @kind method
     * @memberof Topic
     * @static
     * @param {number} topicId
     * @returns {Promise<Topic>}
     */
    static async create(topicId: number): Promise<Topic> {
        const url = await Topic.getTopicURL(topicId);
        return new Topic(topicId, url);
    }

    static async getTopicURL(topicId: number): Promise<string> {
        try {
            const response = await fetch(`https://www.jeuxvideo.com/forums/42-1-${topicId}-1-0-1-0-a.htm`, {
                method: 'GET'
            });
            return response.url;
        } catch (error: any) {
            console.error('Failed to get topic URL:', error.message);
            return '';
        }
    }

    static urlToId(topicUrl: string): number {
        return parseInt(topicUrl.split('-')[2]);
    }

    async doesTopicExist(): Promise<boolean> {
        try {
            if (this._url === '') {
                return false;
            }
            const response = await fetch(this._url, { method: 'GET' });
            return response.status === 200;
        } catch (error) {
            console.error('Failed to check if topic exists:', error);
            return false;
        }
    }
}

export default Topic;
