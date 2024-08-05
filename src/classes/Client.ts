import axios, { AxiosResponse } from 'axios';
import { logger } from './Logger.js';
import { callApi, call } from './utils.js';
import { load } from 'cheerio';
import { LOGIN_FAILED, LOGIN_SUCCESS, WRONG_PASSWORD, JVC_COOLDOWN } from '../vars.js';

const PROFILE_URL = 'https://www.jeuxvideo.com/profil/'
const BANNED_DIV_SELECTOR = '.alert-danger';
const LEVEL_SELECTOR = '.user-level .ladder-link';
const TEST_URL_FORUM = 'https://www.jeuxvideo.com/forums/0-5100-0-1-0-1-0-micromachines-turbo-tournament-96.htm';
const TEST_URL_TOPIC = 'https://www.jeuxvideo.com/forums/42-5100-74631456-1-0-1-0-je-poste-depuis-javascript.htm';
const WARNING_LEVEL_SELECTOR = 'div.alert-warning p';

interface PrimaryInfos {
    existence: boolean;
    isBanned: boolean;
    level: number;
}

interface LoginResponse {
    code: number;
    response: AxiosResponse | null;
}

interface LevelInfos {
    topicLimitReached: boolean;
    messageLimitReached: boolean | null;
}

/**
 * Classe servant à gérer tout ce qui concerne le compte : connexion, obtention d'informations sur le compte... La classe
 * contient un cookie coniunctio généré lors de la connexion qui sera utilisé pour les requêtes nécessitant d'être connecté
 * (posts, profile, etc.).
 * 
 * @class
 * @name Client
 * @kind class
 */
class Client {
    coniunctio: string | null;
    username: string;
    password: string;
    profile: object | null;

    constructor(username: string, password: string) {
        this.coniunctio = null;
        this.username = username;
        this.password = password;
        this.profile = null;
    }

    getCredentials() {
        return { username: this.username, coniunctio: this.coniunctio, password: this.password };
    }

    checkConiunctio(): boolean {
        if (!this.coniunctio) {
            logger.error('Unable to perform operation since you are not logged in.', true);
            return false;
        }
        return true;
    }

    /**
     * Envoie une requête à un forum et un topic pour vérifier si le niveau du client est suffisant pour poster.
     * 
     * @async
     * @method
     * @name checkLevel
     * @kind method
     * @memberof Client
     * @returns {Promise<LevelInfos>}
     */
    async checkLevel(): Promise<LevelInfos> {
        try {
            const forumRes = await call(TEST_URL_FORUM, { method: 'GET', cookies: { 'coniunctio': this.coniunctio } });
            var $ = load(forumRes.data);
            const warningForum = $(WARNING_LEVEL_SELECTOR);
            if (warningForum.length > 0 && warningForum.text().includes('limite')) {
                return { topicLimitReached: true, messageLimitReached: null };
            }

            const topicRes = await call(TEST_URL_TOPIC, { method: 'GET', cookies: { 'coniunctio': this.coniunctio } });
            $ = load(topicRes.data);
            const warningTopic = $(WARNING_LEVEL_SELECTOR);
            if (warningTopic.length > 0 && warningTopic.text().includes('limite')) {
                return { topicLimitReached: false, messageLimitReached: true };
            }

            return { topicLimitReached: false, messageLimitReached: false }

        } catch (err) {
            logger.error(`Issue encountered during level check: ${err}`);
            return { topicLimitReached: null, messageLimitReached: null }
        }
    }

    /**
     * Envoie une requête à l'API de JVC pour obtenir les informations du client (id, niveau, etc.).
     * 
     * @async
     * @method
     * @name getProfileInfos
     * @kind method
     * @memberof Client
     * @returns {Promise<object>}
     */
    async getProfileInfos(): Promise<object> {
        if (!this.checkConiunctio()) {
            logger.error('Failed to get profile infos due to lack of coniunctio.', true);
            return null;
        }
        const url: string = 'accounts/me/profile';

        try {
            const res = await call(url, { method: 'GET', cookies: { 'coniunctio': this.coniunctio } });
            if (res.status === 200) {
                this.profile = res.data;
            } else {
                logger.error('Failed to get profile infos.', true);
                this.profile = null;
            }
        } catch (error) {
            logger.error('Failed to get profile infos.', true);
            this.profile = null;
        }

        return this.profile;
    }

    /**
     * Envoie une requête à la page profil de JVC pour obtenir les informations du client (niveau, statut, existence).
     * 
     * @async
     * @method
     * @name getAccountInfos
     * @kind method
     * @memberof Client
     * @static
     * @param {string} username
     * @returns {Promise<PrimaryInfos>}
     */
    static async getAccountInfos(username: string): Promise<PrimaryInfos> {
        const url = `${PROFILE_URL}${username.toLowerCase()}?mode=infos`;
        logger.info(`Sending a request to ${url} to see if account ${username} exists and if it is banned.`)
        try {
            const res = await axios.get(url);
            const existence = res.status !== 404;
            logger.info(`Does account exist : ${existence}.`);

            if (!existence) {
                return { existence: false, isBanned: null, level: null };
            }
            const $ = load(res.data);
            const isBanned = $(BANNED_DIV_SELECTOR).length > 0;
            const level = isBanned ? null : parseInt($(LEVEL_SELECTOR).text().trim().split(' ')[1]);

            logger.info(`Is account banned : ${isBanned}. Level: ${level}.`);

            return { existence: true, isBanned: isBanned, level: level };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 404) {
                    logger.warn(`Account ${username} does not exist (404 error).`);
                    return { existence: false, isBanned: null, level: null };
                }
            }
            logger.error(`Error seeing if account exist: ${error}`, true);
            return { existence: null, isBanned: null, level: null };
        }
    }

    getConiunctio(): string {
        return this.coniunctio;
    }


    /**
     * Envoie une requête à l'API de JVC accounts/login pour se connecter et sauvegarder le cookie coniunctio généré.
     * 
     * @async
     * @method
     * @name login
     * @kind method
     * @memberof Client
     * @returns {Promise<LoginResponse>}
     */
    async login(): Promise<LoginResponse> {
        const res = await callApi('accounts/login', { method: 'POST', data: { alias: this.username, password: this.password } });
        if (!res) {
            logger.error('Failed to login because of unknown request error.', true);
            return { code: LOGIN_FAILED, response: res };
        }
        if (res.status !== 200) {
            this.coniunctio = null;
            if (res.status === 409 && res.data.message && res.data.message.includes('patienter')) {
                logger.error("Failed to login because JVC wants a cooldown.", true)
                return { code: JVC_COOLDOWN, response: res}
            } else if (res.status === 409) {
                logger.error('Failed to login because of invalid credentials.', true);
                return { code: WRONG_PASSWORD, response: res };
            }
            logger.error('Failed to login because of unknown request error.', true);
            return { code: LOGIN_FAILED, response: res };
        }

        const setCookieHeader = res.headers['set-cookie'];
        this.coniunctio = setCookieHeader ? setCookieHeader[0].split(';')[0].replace('coniunctio=', '') : null;

        logger.info(`Logged in as ${this.username}.`, true);
        logger.info(`Coniunctio: ${this.coniunctio}`);

        return { code: LOGIN_SUCCESS, response: res };
    }

    async logout(): Promise<void | null> {
        if (!this.coniunctio) {
            return null;
        }

        const res = await callApi('accounts/logout', { method: 'POST' });
        if (res && res.status === 204) {
            logger.info('Logged out successfully.', true);
        } else {
            logger.error('Failed to log out.', true);
        }

        this.coniunctio = null;
    }
}

export { Client };
