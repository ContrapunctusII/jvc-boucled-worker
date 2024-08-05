import { JSDOM } from 'jsdom';
import { logger } from './Logger.js';
import { call } from './utils.js';
import { Client } from './Client.js';
import { AxiosResponse } from 'axios';
import { Topic } from './Topic.js';
import { Forum } from './Forum.js';
import { INSUFFICIENT_LEVEL, POSTER_TOO_FAST, POST_FAILED, NOT_CONNECTED, RESOURCE_UNAVAILABLE, TOPIC_DELETED, ACCOUNT_BANNED, POST_SUCCESS } from '../vars.js';
import { load } from 'cheerio';

const TOPIC_FORM_SELECTOR = 'js-form-post-topic';
const MSG_FORM_SELECTOR = 'js-form-post-message';
const ALERT_DIV_SELECTOR = 'div.alert-danger';
const WARNING_LEVEL_SELECTOR = 'div.alert-warning';

interface PostResponse {
    code: number;
    response: AxiosResponse | null;
}

/**
 * Classe servant à poster sur le forum (messages et topics).
 * 
 * @class
 * @name ForumClient
 * @kind class
 */
class ForumClient {
    client: Client;
    coniunctio: string;

    constructor(client: Client) {
        this.client = client;
        this.coniunctio = client.getConiunctio();
    }

    checkConiunctio() : boolean {
        if (!this.coniunctio) {
            logger.error('Unable to perform operation since you are not logged in.', true);
            return false;
        }
        return true;
    }

    /**
     * Récupère les tokens générés lorsque l'on envoie une requête à une page de forum/topic.
     * Ces tokens sont nécessaires pour envoyer un topic/message.
     * 
     * @async
     * @method
     * @name scrapeInputTokens
     * @kind method
     * @memberof ForumClient
     * @param {AxiosResponse} res
     * @param {string} formSelector
     * @returns {Promise<object>}
     */
    async scrapeInputTokens(res: AxiosResponse, formSelector: string) : Promise<object> {
        try {
            const dom = new JSDOM(res.data);
            const form = dom.window.document.querySelector(`form.${formSelector}`);
            const inputs = form.querySelectorAll("input");

            const tokens: {[k: string]: any} = {
                fs_session: inputs[0].value,
                fs_timestamp: inputs[1].value,
                fs_version: inputs[2].value,
                [inputs[3].name]: inputs[3].value,
                form_alias_rang: "1",
                "g-recaptcha-response": ""
            };

            return tokens;
        } catch (err) {
            logger.error(`Error while scraping input tokens: ${err}.`);
            if (err instanceof TypeError) {
                logger.error(`Account seems not to have a sufficient level to post.`, true);
                return { errorCode: INSUFFICIENT_LEVEL };
            }
            return { errorCode: POST_FAILED };
        }
    }

    /**
     * Envoie un message avec une requête GET pour récupérer les tokens puis une requête POST pour poster le message.
     * Vérifie si le topic existe, si le compte est connecté et si le compte est banni.
     *
     * @async
     * @method
     * @name postMessage
     * @kind method
     * @memberof ForumClient
     * @param {Topic} topic
     * @param {string} message
     * @returns {Promise<PostResponse>}
     */
    async postMessage(topic: Topic, message: string) : Promise<PostResponse> {
        const cookies = { coniunctio: this.coniunctio };

        if (!this.checkConiunctio()) {
            return { code: NOT_CONNECTED, response: null };
        }

        if (!await topic.doesTopicExist()) {
            logger.error('Topic does not exist.', true);
            return { code: TOPIC_DELETED, response: null };
        }

        const { username, coniunctio, password } = this.client.getCredentials();
        const { existence, isBanned, level } = await Client.getAccountInfos(username);

        if (isBanned) {
            logger.error('Cannot post from banned account.', true);
            return { code: ACCOUNT_BANNED, response: null};
        }

        const topicURL = topic.getURL();
        const res = await call(topicURL, { method: 'GET', cookies: cookies });
        const data: {[k: string]: any} = await this.scrapeInputTokens(res, MSG_FORM_SELECTOR);
        
        if (data.errorCode) {
            return { code: data.errorCode, response: null }
        }

        data.message_topic = message;

        const postRes = await call(topicURL, { method: 'POST', data: data, headers: { 'Content-Type':'application/x-www-form-urlencoded' }, cookies: cookies});
        if (postRes.status === 200) {
            const responseMsg = ForumClient.analyzeResponseContent(postRes);
            if (!responseMsg) {
                logger.info('Message successfully sent.', true);
                return { code: POST_SUCCESS, response: postRes };
            }
            if (responseMsg === 'alert') {
                logger.error('Message not sent because of too fast poster.', true);
                return { code: POSTER_TOO_FAST, response: postRes };
            }
            logger.error('Message not sent because of insufficient level.', true);
            return { code: INSUFFICIENT_LEVEL, response: postRes };
        }

        logger.error('Failed to send topic.', true);
        return { code: POST_FAILED, response: postRes };
    }

    /**
     * Après le post, analyse la réponse HTML pour voir si JVC a envoyé des erreurs. Si une alerte : compte banni, topic supprimé, message invalide ou délai
     * trop court après le dernier post ; si un avertissement : problème de niveau.
     * 
     * @method
     * @name analyzeResponseContent
     * @kind method
     * @memberof ForumClient
     * @static
     * @param {AxiosResponse} response
     * @returns {'alert' | 'deleted' | 'warning' | null}
     */
    static analyzeResponseContent(response: AxiosResponse): 'alert' | 'deleted' | 'warning' | null {
        try {
            const $ = load(response.data);
            const alertDiv = $(ALERT_DIV_SELECTOR);

            if (alertDiv.length > 0) {
                logger.warn(`Encountered alert div after posting: ${alertDiv.text()}`);
                if (alertDiv.text().includes('supprimé')) {
                    return 'deleted';
                }
                return 'alert';
            }
            const warningDiv = $(WARNING_LEVEL_SELECTOR);
            if (warningDiv.length > 0) {
                logger.warn(`Encountered warning div after posting: ${warningDiv.text()}`);
                return 'warning';
            }
            return null;
        } catch (err) {
            logger.error(`Error while analyzing response content: ${err}.`);
            return null;
        }
    }

    /**
     * Envoie un topic avec une requête GET pour récupérer les tokens puis une requête POST pour poster le topic.
     * Vérifie si le forum existe, si le compte est connecté et si le compte est banni.
     * 
     * @async
     * @method
     * @name postTopic
     * @kind method
     * @memberof ForumClient
     * @param {Forum} forum
     * @param {string} titre
     * @param {string} message
     * @param {Object} sondage?
     * @returns {Promise<PostResponse>}
     */
    async postTopic(forum: Forum, titre: string, message: string, sondage: Object = null): Promise<PostResponse> {
        if (!this.checkConiunctio()) {
            return { code: NOT_CONNECTED, response: null};
        }

        const cookies = { coniunctio: this.coniunctio };

        if (!await forum.doesForumExist()) {
            logger.error('Forum does not exist.', true);
            return  { code: RESOURCE_UNAVAILABLE, response: null};
        }

        const { username, coniunctio, password } = this.client.getCredentials();
        const { existence, isBanned, level } = await Client.getAccountInfos(username);

        if (isBanned) {
            logger.error('Cannot post from banned account.', true);
            return { code: ACCOUNT_BANNED, response: null};
        }
    
        const forumURL = forum.getURL();
        const res = await call(forumURL, { method: 'GET', cookies: cookies });
        const data: {[k: string]: any} = await this.scrapeInputTokens(res, TOPIC_FORM_SELECTOR);
        
        if (data.errorCode) {
            return { code: data.errorCode, response: null };
        }
        
        data.titre_topic = titre;
        data.message_topic = message;

        if (sondage) {
            Object.assign(data, sondage);
            data.submit_sondage = '1';
        }
        
        const postRes = await call(forumURL, { method: 'POST', data: data, headers: { 'Content-Type':'application/x-www-form-urlencoded' }, cookies: cookies});
        if (postRes.status === 200) {
            const responseMsg = ForumClient.analyzeResponseContent(postRes);
            if (!responseMsg) {
                logger.info('Topic successfully sent.', true);
                return { code: POST_SUCCESS, response: postRes };
            }
            if (responseMsg === 'alert') {
                logger.error('Topic not sent because of too fast poster.', true);
                return { code: POSTER_TOO_FAST, response: postRes };
            }
            if (responseMsg === 'deleted') {
                logger.error('Topic deleted.', true);
                return { code: TOPIC_DELETED, response: postRes };
            }
            logger.error('Topic not sent because of insufficient level.', true);
            return { code: INSUFFICIENT_LEVEL, response: postRes };
        }

        logger.error('Failed to send topic.', true);
        return { code: POST_FAILED, response: postRes };
    }
}

export { ForumClient };
