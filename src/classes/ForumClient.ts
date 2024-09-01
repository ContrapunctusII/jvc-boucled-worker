import { call } from './utils.js';
import Client from './Client.js';
import Topic from './Topic.js';
import Forum from './Forum.js';
import {
    INSUFFICIENT_LEVEL, POSTER_TOO_FAST, POST_FAIL, NOT_CONNECTED, RESOURCE_UNAVAILABLE,
    TOPIC_DELETED, ACCOUNT_BANNED, POST_SUCCESS, JVC_ALERT, JVC_WARNING, JVC_CAPTCHA
} from '../vars.js';
import { load } from 'cheerio';
import { TOPIC_FORM_SELECTOR, MSG_FORM_SELECTOR, ALERT_DIV_SELECTOR, WARNING_DIV_SELECTOR } from '../vars.js';

export interface ForumClientInfo {
    jvcErrorWarningText?: string;
}

/**
 * La réponse renvoyée après un post de message ou de topic.
 * 
 * @interface
 * @name ForumClientPostResponse
 * @kind interface
 * @exports
 */
export interface ForumClientPostResponse {
    code: number;
    response: globalThis.Response | null;
    info: ForumClientInfo;
    url: string;
}

/**
 * Liste des types :
 * alert : JVC a renvoyé une div d'alerte (comme message invalide)
 * warning : JVC a renvoyé une div d'avertissement
 * deleted : le topic a été supprimé
 * spamAlert : JVC requiert de résoudre un captcha avant de continuer
 * levelWarning : le compte n'a pas un niveau suffisant pour poster
 * error : erreur de requête
 * captcha : JVC requiert de résoudre un captcha avant de continuer
 * 
 * @interface
 * @name JVCMessage
 * @kind interface
 */
interface JVCMessage {
    type: 'alert' | 'warning' | 'deleted' | 'spamAlert' | 'levelWarning' | 'error' | 'captcha' | '';
    text: string;
}

/**
 * Classe servant à poster sur le forum (messages et topics).
 * 
 * @class
 * @name ForumClient
 * @kind class
 */
class ForumClient {
    private _client: Client;
    private _coniunctio: string;

    constructor(client: Client) {
        this._client = client;
        this._coniunctio = client.coniunctio;
    }

    private checkConiunctio(): boolean {
        if (!this._coniunctio) {
            console.error('Unable to perform operation since you are not logged in.');
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
    private async scrapeInputTokens(responseText: string, formSelector: string): Promise<object> {
        try {
            const $ = load(responseText);
            const form = $(formSelector);
            const inputs = form.find('input');

            const tokens: { [k: string]: any } = {
                fs_session: inputs.eq(0).val(),
                fs_timestamp: inputs.eq(1).val(),
                fs_version: inputs.eq(2).val(),
                [inputs.eq(3).attr('name') as string]: inputs.eq(3).val(),
                form_alias_rang: '1',
                'g-recaptcha-response': ''
            };

            return tokens;
        } catch (err) {
            console.error(`Error while scraping input tokens: ${err}.`);
            if (err instanceof TypeError) {
                console.error(`Account seems not to have a sufficient level to post.`);
                return { errorCode: INSUFFICIENT_LEVEL };
            }
            return { errorCode: POST_FAIL };
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
    async postMessage(topic: Topic, message: string): Promise<ForumClientPostResponse> {
        const cookies = { coniunctio: this._coniunctio };

        const defaultInfo = { jvcErrorWarningText: '' };

        if (!this.checkConiunctio()) {
            return { code: NOT_CONNECTED, response: null, info: defaultInfo, url: '' };
        }

        if (!await topic.doesTopicExist()) {
            console.error('Topic does not exist.');
            return { code: TOPIC_DELETED, response: null, info: defaultInfo, url: '' };
        }

        const { username, coniunctio, password } = this._client.getCredentials();
        const { existence, isBanned, level } = await Client.getAccountInfos(username);

        if (isBanned || existence === null) {
            console.error('Cannot post from banned account.');
            return { code: ACCOUNT_BANNED, response: null, info: defaultInfo, url: '' };
        }

        const topicURL = topic.url;
        // première requête pour obtenir les inputs
        const res = await call(topicURL, { method: 'GET', cookies: cookies });
        if (!res) {
            return { code: POST_FAIL, response: res, info: defaultInfo, url: '' };
        }
        const data: { [k: string]: any } = await this.scrapeInputTokens(await res.clone().text(), MSG_FORM_SELECTOR);

        if (data.errorCode) {
            return { code: data.errorCode, response: null, info: defaultInfo, url: '' }
        }

        data.message_topic = message;

        // deuxième requête pour poster
        const postRes = await call(topicURL, { method: 'POST', data: data, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, cookies: cookies, useProxy: true });

        if (!postRes) {
            return { code: POST_FAIL, response: postRes, info: defaultInfo, url: '' };
        }

        if (postRes.status === 200) {
            const responseMsg = this.analyzeResponseContent(await postRes.clone().text());
            return this.whatToReturn(responseMsg, postRes, defaultInfo);
        }

        console.error('Failed to send message.');
        return { code: POST_FAIL, response: postRes, info: defaultInfo, url: '' };
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
    private analyzeResponseContent(responseText: string): JVCMessage {
        try {
            const $ = load(responseText);
            const alertDiv = $(ALERT_DIV_SELECTOR); // div d'alerte potentiellement présente dans la page HTML renvoyée par JVC

            if (alertDiv.length > 0) {
                console.warn(`Encountered alert div after posting: ${alertDiv.text()}`);
                if (alertDiv.text().includes('supprimé')) {
                    return { type: 'deleted', text: alertDiv.text().trim() };
                }
                if (alertDiv.text().includes('patienter')) {
                    return { type: 'spamAlert', text: alertDiv.text().trim() };
                }
                if (alertDiv.text().includes('captcha')) {
                    return { type: 'captcha', text: alertDiv.text().trim() };
                }
                return { type: 'alert', text: alertDiv.text().trim() };
            }

            const warningDiv = $(WARNING_DIV_SELECTOR);
            if (warningDiv.length > 0) {
                console.warn(`Encountered warning div after posting: ${warningDiv.text()}`);
                if (warningDiv.text().includes('limite')) {
                    return { type: 'levelWarning', text: warningDiv.text().trim() };
                }
                return { type: 'warning', text: warningDiv.text().trim() };
            }
            return { type: '', text: '' };
        } catch (err) {
            console.error(`Error while analyzing response content: ${err}.`);
            return { type: 'error', text: '' };
        }
    }

    /**
     * Détermine l'objet à renvoyer en fonction du message JVC obtenu.
     * 
     * @method
     * @name whatToReturn
     * @kind method
     * @memberof ForumClient
     * @private
     * @param {JVCMessage} responseMsg
     * @param {Response} postRes
     * @param {ForumClientInfo} defaultInfo
     * @returns {ForumClientPostResponse}
     */
    private whatToReturn(responseMsg: JVCMessage, postRes: Response, defaultInfo: ForumClientInfo): ForumClientPostResponse {
        const url = postRes.headers.get('x-url') as string; // URL du topic envoyé par le proxy dans le header x-url

        switch (responseMsg.type) {
            case 'spamAlert':
                console.error('Post not sent because of too fast poster.');
                return { code: POSTER_TOO_FAST, response: postRes, info: defaultInfo, url };
            case 'deleted':
                console.error('Topic deleted.');
                return { code: TOPIC_DELETED, response: postRes, info: defaultInfo, url };
            case 'levelWarning':
                console.error('Post not sent because of insufficient level.');
                return { code: INSUFFICIENT_LEVEL, response: postRes, info: defaultInfo, url };
            case 'alert':
                console.error('Post not sent because of alert div.');
                return { code: JVC_ALERT, response: postRes, info: { jvcErrorWarningText: responseMsg.text }, url };
            case 'warning':
                console.error('Post not sent because of warning div.');
                return { code: JVC_WARNING, response: postRes, info: { jvcErrorWarningText: responseMsg.text }, url };
            case 'error':
                console.error('Post not sent because of unknown error.');
                return { code: POST_FAIL, response: postRes, info: defaultInfo, url };
            case 'captcha':
                console.error('Post not sent because of captcha.');
                return { code: JVC_CAPTCHA, response: postRes, info: defaultInfo, url };
            default:
                console.info('Post successfully sent.');
                return { code: POST_SUCCESS, response: postRes, info: defaultInfo, url };
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
    async postTopic(forum: Forum, titre: string, message: string, sondage: Object = {}): Promise<ForumClientPostResponse> {
        const defaultInfo = { jvcErrorWarningText: '' };

        if (!this.checkConiunctio()) {
            return { code: NOT_CONNECTED, response: null, info: defaultInfo, url: '' };
        }

        const cookies = { coniunctio: this._coniunctio };

        if (!await forum.doesForumExist()) {
            console.error('Forum does not exist.');
            return { code: RESOURCE_UNAVAILABLE, response: null, info: defaultInfo, url: '' };
        }

        const { username, coniunctio, password } = this._client.getCredentials();
        const { existence, isBanned, level } = await Client.getAccountInfos(username);

        if (isBanned || existence === null) {
            console.error('Cannot post from banned account.');
            return { code: ACCOUNT_BANNED, response: null, info: defaultInfo, url: '' };
        }

        const forumURL = forum.url;
        const res = await call(forumURL, { method: 'GET', cookies: cookies });

        if (!res) {
            return { code: POST_FAIL, response: res, info: defaultInfo, url: '' };
        }

        const data: { [k: string]: any } = await this.scrapeInputTokens(await res.clone().text(), TOPIC_FORM_SELECTOR);

        if (data.errorCode) {
            return { code: data.errorCode, response: null, info: defaultInfo, url: '' };
        }

        data.titre_topic = titre;
        data.message_topic = message;

        if (Object.keys(sondage).length > 0) {
            Object.assign(data, sondage);
            data.submit_sondage = '1';
        }

        const postRes = await call(forumURL, { method: 'POST', data: data, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, cookies: cookies, useProxy: true });

        if (!postRes) {
            return { code: POST_FAIL, response: postRes, info: defaultInfo, url: '' };
        }

        console.log(postRes.status);

        if (postRes.status === 200) {
            const responseMsg = this.analyzeResponseContent(await postRes.clone().text());
            return this.whatToReturn(responseMsg, postRes, defaultInfo);
        }
        console.error('Failed to send topic.');
        return { code: POST_FAIL, response: postRes, info: defaultInfo, url: '' };
    }
}

export default ForumClient;