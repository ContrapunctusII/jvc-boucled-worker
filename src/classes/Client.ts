import { callApi, call } from './utils.js';
import { load } from 'cheerio';
import {
    LOGIN_FAIL, LOGIN_SUCCESS, WRONG_PASSWORD, JVC_COOLDOWN, PROFILE_URL,
    ALERT_DIV_SELECTOR, LEVEL_SELECTOR, TEST_URL_FORUM, TEST_URL_TOPIC, WARNING_DIV_SELECTOR
} from '../vars.js';

/**
 * Informations basiques sur le compte, incluant : son existence, son statut (banni ou non) et son niveau.
 * 
 * @interface
 * @name PrimaryInfos
 * @kind interface
 */
interface PrimaryInfos {
    existence: boolean | null;
    isBanned: boolean;
    level: number;
}

/**
 * Interface utilisée pour rendre compte de la connexion au compte.
 * 
 * @interface
 * @name LoginResponse
 * @kind interface
 */
interface LoginResponse {
    code: number;
    response: globalThis.Response | null;
    coniunctio: string;
}

/**
 * Interface utilisée pour savoir si : le compte a atteint sa limite journalière de topics ; le compte a atteint sa limite journalière
 * de messages.
 * 
 * @interface
 * @name LevelInfos
 * @kind interface
 */
interface LevelInfos {
    topicLimitReached: boolean | null;
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
    private _coniunctio: string;
    private _username: string;
    private _password: string;

    constructor(username: string, password: string) {
        this._coniunctio = '';
        this._username = username;
        this._password = password;
    }

    getCredentials(): { username: string; coniunctio: string; password: string; } {
        return { username: this._username, coniunctio: this._coniunctio, password: this._password };
    }

    checkConiunctio(): boolean {
        if (!this._coniunctio) {
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
            const forumRes = await call(TEST_URL_FORUM, { method: 'GET', cookies: { 'coniunctio': this._coniunctio } });
            if (!forumRes) {
                return { topicLimitReached: null, messageLimitReached: null };
            }
            var $ = load(await forumRes.text());
            const warningForum = $(WARNING_DIV_SELECTOR); // détection d'un message d'avertissement de JVC
            if (warningForum.length > 0 && warningForum.text().includes('limite')) {
                return { topicLimitReached: true, messageLimitReached: null };
            }

            const topicRes = await call(TEST_URL_TOPIC, { method: 'GET', cookies: { 'coniunctio': this._coniunctio } });
            if (!topicRes) {
                return { topicLimitReached: null, messageLimitReached: null };
            }
            $ = load(await topicRes.text());
            const warningTopic = $(WARNING_DIV_SELECTOR); // détection d'un message d'avertissement de JVC
            if (warningTopic.length > 0 && warningTopic.text().includes('limite')) {
                return { topicLimitReached: false, messageLimitReached: true };
            }

            return { topicLimitReached: false, messageLimitReached: false }

        } catch (err) {
            return { topicLimitReached: null, messageLimitReached: null }
        }
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
        const url = PROFILE_URL.replace('*', username.toLowerCase());
        try {
            const res = await fetch(url, { method: 'GET' });
            const existence = res.status !== 404;
            if (!existence) {
                return { existence: false, isBanned: false, level: 0 };
            }
            const $ = load(await res.text());
            const isBanned = $(ALERT_DIV_SELECTOR).length > 0;
            // si le compte est banni, on n'a pas accès à son niveau que l'on met à 0
            const level = isBanned ? 0 : parseInt($(LEVEL_SELECTOR).text().trim().split(' ')[1]);

            return { existence: true, isBanned: isBanned, level: level };
        } catch (error) {
            console.error(error);
            return { existence: null, isBanned: false, level: 0 };
        }
    }

    get coniunctio(): string {
        return this._coniunctio;
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
        const res = await callApi('accounts/login', { method: 'POST', data: { alias: this._username, password: this._password }, useProxy: true });
        if (!res) {
            return { code: LOGIN_FAIL, response: res, coniunctio: '' };
        }
        const data: any = await res.clone().json();

        if (res.status !== 200) {
            this._coniunctio = '';
            if (res.status === 409 && data.message && data.message.includes('patienter')) {
                // parfois il y a un cooldown avant le login pour des raisons obscures, sûrement au bout d'un trop grand nombre de connexions
                return { code: JVC_COOLDOWN, response: res, coniunctio: '' }
            } else if (res.status === 409) {
                return { code: WRONG_PASSWORD, response: res, coniunctio: '' };
            }
            return { code: LOGIN_FAIL, response: res, coniunctio: '' };
        }

        // récupération du cookie coniunctio dans la requête
        const setCookieHeader = res.headers.get('set-cookie');
        if (!setCookieHeader) {
            this._coniunctio = '';
            return { code: LOGIN_FAIL, response: res, coniunctio: '' };
        }
        const coniunctioCookie = setCookieHeader
            .split(';')
            .find(cookie => cookie.trim().startsWith('coniunctio='));

        this._coniunctio = coniunctioCookie ? coniunctioCookie.split('=')[1] : '';
        return { code: LOGIN_SUCCESS, response: res, coniunctio: this._coniunctio };
    }

    /**
     * Déconnexion du compte actuel.
     * 
     * @async
     * @method
     * @name logout
     * @kind method
     * @memberof Client
     * @returns {Promise<void>}
     */
    async logout(): Promise<void> {
        if (!this._coniunctio) {
            return;
        }

        const res = await callApi('accounts/logout', { method: 'POST' });
        this._coniunctio = '';
    }
}

export default Client;