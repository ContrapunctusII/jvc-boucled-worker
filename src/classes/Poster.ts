import { Client } from "./Client.js";
import { Forum } from "./Forum.js";
import { Topic } from "./Topic.js";
import { ForumClient } from "./ForumClient.js";
import { logger } from "./Logger.js";
import { Loop } from "../interfaces/Loop.js";
import { Account } from "../interfaces/Account.js";
import { sleep } from "../services/utils.js";
import { LOGIN_SUCCESS, WRONG_PASSWORD, NO_ACCOUNT_AVAILABLE, ALL_ACCOUNTS_USED, POST_SUCCESS, POSTER_TOO_FAST, POST_FAILED, INSUFFICIENT_LEVEL, TOPIC_DELETED, ACCOUNT_BANNED, NOT_CONNECTED } from '../vars.js';

const RETRY_TIMEOUT = 25000;
const MAX_RETRIES = 2;

interface PosterResponse {
    code: number;
    info: {[k: string]: any} | null;
}

/**
 * Classe qui va gérer le post d'une boucle.
 * 
 * @class
 * @name Poster
 * @kind class
 */
class Poster {
    loop: Loop; // l'objet boucle à poster
    availableAccounts: Array<Account>; // liste des comptes utilisables (non bannis, niveau suffisant, etc.)
    allAccounts: Array<Account>; // liste de tous les comptes associés à la boucle
    accountsToUpdate: Array<Account>; // liste des comptes dont le statut a été modifié durant le post
    account: Account; // compte choisi pour poster
    client: Client; // client de ce compte
    forumClient: ForumClient;
    retriesCount: number; // variable gardant le nombre d'essais
    topicURL: string;
    topicId: number;

    constructor(loop: Loop, accounts: Array<Account>) {
        this.loop = loop;
        this.retriesCount = 0;
        this.availableAccounts = [...accounts];
        this.allAccounts = [...accounts];
        this.accountsToUpdate = [];
        this.topicURL = '';
    }

    getTopicURL(): string {
        return this.topicURL;
    }

    getAccountsToUpdate(): Array<Account> {
        return this.accountsToUpdate;
    }
    
    /**
     * Méthode principale qui post la boucle à travers différentes étapes : choix du compte, création du client,
     * post du topic, post des réponses. Les codes d'erreurs possibles sont les suivants :
     * NO_ACCOUNT_AVAILABLE, ALL_ACCOUNTS_USED : plus de compte disponible (tous bannis ou tous de niveau insuffisant) : abandon.
     * TOPIC_DELETED : topic posté mais supprimé, réussite partielle, abandon.
     * INSUFFICIENT_LEVEL : niveau insuffisant, choix d'un nouveau compte pour continuer.
     * ACCOUNT_BANNED : le compte a été banni, choix d'un nouveau compte pour continuer.
     * POSTER_TOO_FAST : le délai entre les posts est trop rapide pour JVC, cooldown. Si trop de tentatives ratées, choix d'un nouveau compte.
     * 
     * @async
     * @method
     * @name post
     * @kind method
     * @memberof Poster
     * @returns {Promise<PosterResponse>}
     */
    async post(): Promise<PosterResponse> {
        logger.info(`Starting post of loop ${JSON.stringify(this.loop)}.`);
        const setPosterCode = await this.setPosterAccount();
        if (setPosterCode === NO_ACCOUNT_AVAILABLE) {
            logger.error('No account available for posting. Operation aborted.', true);
            return { code: NO_ACCOUNT_AVAILABLE, info: null };
        }

        this.forumClient = new ForumClient(this.client);

        const { code, info } = await this.postTopic();
        if (code !== POST_SUCCESS) {
            return { code, info };
        }
        this.topicId = Topic.urlToId(this.topicURL);
        const topic = await Topic.create(this.topicId);
        var nb = 0;

        for (const answer of this.loop.answers) {
            nb++;
            let retryCount = 0;
            const splitDelay = answer.delay.split(':');
            const sleepTime = parseInt(splitDelay[0])*60*1000 + parseInt(splitDelay[1])*1000;
            await sleep(sleepTime);
            let answerCode = await this.postMessage(topic, answer.text);

            if (answerCode === TOPIC_DELETED) {
                logger.error('Topic deleted, aborting loop.', true);
                return { code: TOPIC_DELETED, info: { topicURL: this.topicURL }};
            }

            while ([INSUFFICIENT_LEVEL, ACCOUNT_BANNED].includes(answerCode)) {
                if (answerCode === ACCOUNT_BANNED) {
                    this.account.isBanned = true;
                }
                logger.warn('Insufficient level or banned account, setting another account.', true);
                const code = await this.setAnotherPosterAccount();

                if (code === ALL_ACCOUNTS_USED) {
                    logger.error('No more account available.', true);
                    return { code: ALL_ACCOUNTS_USED, info: { done: nb !==0 ? `réponse ${nb}` : 'topic'} };
                }
                
                answerCode = await this.postMessage(topic, answer.text);
            }

            while ([POSTER_TOO_FAST, NOT_CONNECTED].includes(answerCode)) {
                logger.warn('Poster too fast, timeout.', true);
                retryCount++;
                if (retryCount > MAX_RETRIES) {
                    const code = await this.setAnotherPosterAccount();

                    if (code === ALL_ACCOUNTS_USED) {
                        logger.error('No more account available.', true);
                        return { code: ALL_ACCOUNTS_USED, info: { done: nb !==0 ? `réponse ${nb}` : 'topic'} };
                    }

                    retryCount = 0;
                }
                await sleep(RETRY_TIMEOUT);
                answerCode = await this.postMessage(topic, answer.text);
            }

            if (answerCode !== POST_SUCCESS) {
                return { code: answerCode, info: null };
            }
        }
        return { code: POST_SUCCESS, info: { topicURL: this.topicURL } };
    }

    /**
     * Choix d'un nouveau compte pour poster la boucle.
     * 
     * @async
     * @method
     * @name setAnotherPosterAccount
     * @kind method
     * @memberof Poster
     * @returns {Promise<number>}
     */
    async setAnotherPosterAccount(): Promise<number> {
        const index = this.accountsToUpdate.findIndex(a => a.id === this.account.id); // mise à jour du compte
        this.accountsToUpdate[index] = this.account;
        this.availableAccounts = this.availableAccounts.filter(account => account.id !== this.account.id); // on enlève le compte existant qui a été banni ou de niveau restreint
        const code = await this.setPosterAccount();

        if (code === NO_ACCOUNT_AVAILABLE) {
            return ALL_ACCOUNTS_USED;
        }

        return POST_SUCCESS;
    }

    /**
     * Choix du premier compte pour le post. Le compte choisi ne doit pas être banni, il doit être existant,
     * avoir un mot de passe fonctionnel et un niveau suffisant.
     * 
     * @async
     * @method
     * @name setPosterAccount
     * @kind method
     * @memberof Poster
     * @returns {Promise<number>}
     */
    async setPosterAccount(): Promise<number> {
        for (const account of this.availableAccounts) {
            const { existence, isBanned, level } = await Client.getAccountInfos(account.username);
            account.isBanned = isBanned;
            account.level = level;
            if (!existence) {
                account.unusable = true;
            }
            const index = this.accountsToUpdate.findIndex(a => a.id = account.id);
            if (index === -1) {
                this.accountsToUpdate.push(account);
            } else {
                this.accountsToUpdate[index] = account;
            }

            if (existence && !isBanned && !account.unusable) {
                const client = new Client(account.username, account.password);
                const { code, response } = await client.login();
                if (code === LOGIN_SUCCESS) {
                    const { topicLimitReached, messageLimitReached } = await client.checkLevel();
                    if (topicLimitReached === false && messageLimitReached === false) {
                        this.account = account;
                        this.client = client;
                        return POST_SUCCESS;
                    }
                }
                if (code === WRONG_PASSWORD) {
                    logger.warn(`Account ${account} has changed its password.`, true);
                    account.unusable = true;
                }
            }
        }
        return NO_ACCOUNT_AVAILABLE;
    }

    /**
     * Poste le message avec ForumClient.
     * 
     * @async
     * @method
     * @name postMessage
     * @kind method
     * @memberof Poster
     * @param {Topic} topic
     * @param {string} message
     * @returns {Promise<number>}
     */
    async postMessage(topic: Topic, message: string): Promise<number> {
        logger.info(`Posting message: ${message}. with client ${JSON.stringify(this.client)}`);
        var { code, response } = await this.forumClient.postMessage(topic, message);

        return code;
    }

    /**
     * Poste le topic avec ForumClient après avoir créé un objet Forum. Les codes d'erreur renvoyés
     * sont détaillés dans la doc de la méthode post.
     * 
     * @async
     * @method
     * @name postTopic
     * @kind method
     * @memberof Poster
     * @returns {Promise<PosterResponse>}
     */
    async postTopic(): Promise<PosterResponse> {
        logger.info(`Posting topic for loop ${JSON.stringify(this.loop)} with client ${JSON.stringify(this.client.getCredentials())}.`);
        const forum = await Forum.create(this.loop.forumId);
        var { code, response } = await this.forumClient.postTopic(forum, this.loop.title, this.loop.first_message);
        
        if ([INSUFFICIENT_LEVEL, ACCOUNT_BANNED].includes(code)) {
            if (code === ACCOUNT_BANNED) {
                this.account.isBanned = true;
            }
            logger.warn('Insufficient level or banned account, setting another account.', true);
            const newPosterCode = await this.setAnotherPosterAccount();

            if (newPosterCode === ALL_ACCOUNTS_USED) {
                logger.error('No more account available.', true);
                return { code: ALL_ACCOUNTS_USED, info: { done: null }};
            }
            return await this.postTopic();
        }
        if ([POSTER_TOO_FAST, NOT_CONNECTED].includes(code)) {
            this.retriesCount++;
            logger.warn('Poster too fast, timeout.', true);
            if (this.retriesCount > MAX_RETRIES) {
                logger.error('Too many retries, setting another account.', true);
                const code = await this.setAnotherPosterAccount();

                if (code === ALL_ACCOUNTS_USED) {
                    logger.error('No more account available.', true);
                    return { code: ALL_ACCOUNTS_USED, info: { done: null }};
                }

                this.retriesCount = 0;
            }
            await sleep(RETRY_TIMEOUT);
            return await this.postTopic();
        }

        if (code === POST_SUCCESS) {
            logger.info('Poster succeeded in posting the topic.');
            this.topicURL = response.request.res.responseUrl;

            return { code: POST_SUCCESS, info: null };
        }

        return { code: POST_FAILED, info: null };
    }
}

export { Poster };