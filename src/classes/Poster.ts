import Client from "./Client.js";
import Forum from "./Forum.js";
import Topic from "./Topic.js";
import ForumClient, { ForumClientInfo, ForumClientPostResponse } from "./ForumClient.js";
import Loop from "../interfaces/Loop.js";
import Account from "../interfaces/Account.js";
import { sleep } from "../services/utils.js";
import {
    LOGIN_SUCCESS, NO_ACCOUNT_AVAILABLE, ALL_ACCOUNTS_USED, POST_SUCCESS, POSTER_TOO_FAST,
    POST_FAIL, INSUFFICIENT_LEVEL, TOPIC_DELETED, ACCOUNT_BANNED, NOT_CONNECTED, JVC_CAPTCHA, POST_RETRY_TIMEOUT, POST_MAX_RETRIES_NUMBER
} from '../vars.js';
import ServerLog from "../interfaces/ServerLog.js";
import logger from "./Logger.js";

/**
 * Interface de l'objet renvoyé par les méthodes postAnswer et postTopic.
 * 
 * @interface
 * @name PostResponseInfo
 * @kind interface
 * @exports
 */
export interface PostResponseInfo extends ForumClientInfo {
    topicURL?: string;
    postType: 'answer' | 'topic';
}

export interface PostResponse {
    code: number;
    response: globalThis.Response | null;
    info: PostResponseInfo;
}

class Poster {
    private _loop: Loop;
    private _availableAccounts: Array<Account>; // tous les comptes qui n'ont pas encore été vérifiés pour le post de la boucle
    private _accountsToUpdate: Array<Account>; // les comptes qu'il faudra mettre à jour à l'issue du post
    private _account!: Account; // le compte actuellement utilisé pour le post
    private _client!: Client;
    private _forumClient!: ForumClient;
    private _retriesCount: number; // le nombre de fois qu'une opération renouvelable a été réessayée (post après cooldown par exemple)
    private _topicURL: string;

    constructor(loop: Loop, accounts: Array<Account>) {
        this._loop = loop;
        this._retriesCount = 0;
        this._availableAccounts = [...accounts];
        this._accountsToUpdate = [];
        this._topicURL = '';
    }

    get topicURL(): string {
        return this._topicURL;
    }

    get accountsToUpdate(): Array<Account> {
        return this._accountsToUpdate;
    }

    /**
     * Fonction qui ajoute un log à la base de données en fonction du code renvoyé par ForumClient.
     * Tous les codes ne sont pas présents car certains sont traités dans la fonction logResult du fichier services/send_loop.ts.
     * 
     * @async
     * @method
     * @name logPostCode
     * @kind method
     * @memberof Poster
     * @private
     * @param {number} code
     * @param {'topic' | 'answer'} postType
     * @returns {Promise<void>}
     */
    private async logPostCode(code: number, postType: 'topic' | 'answer'): Promise<void> {
        if (![INSUFFICIENT_LEVEL, ACCOUNT_BANNED, JVC_CAPTCHA, POSTER_TOO_FAST, NOT_CONNECTED].includes(code)) {
            return;
        }
        const operationStr = postType === 'topic' ? `post d'un topic par ${this._account.username}` : `post d'une réponse par ${this._account.username}`;
        const log: ServerLog = { id: 0, date: new Date(), type: 'info', operation: operationStr, message: '', details: '' };

        switch (code) {
            case INSUFFICIENT_LEVEL:
                log.type = 'attention';
                log.message = 'INSUFFICIENT_LEVEL';
                log.details = "Le compte mentionné ne dispose pas d'un niveau suffisant pour poster.";
                break;
            case ACCOUNT_BANNED:
                log.type = 'attention';
                log.message = 'ACCOUNT_BANNED';
                log.details = "Le compte mentionné a été banni avant de pouvoir poster.";
                break;
            case JVC_CAPTCHA:
                log.type = 'attention';
                log.message = 'JVC_CAPTCHA';
                log.details = "L'IP ou le compte mentionné a rencontré une erreur de captcha. Changement de compte.";
                break;
            case POSTER_TOO_FAST:
                log.type = 'attention';
                log.message = 'POSTER_TOO_FAST';
                log.details = `L'IP ou le compte mentionné a déjà posté trop récemment pour pouvoir poster maintenant. Délai d'attente de ${POST_RETRY_TIMEOUT / 1000} secondes.`;
                break;
            default:
                log.type = 'erreur';
                log.message = 'POST_FAIL';
                log.details = 'Le compte mentionné n\'a pas réussi à poster.';
                break;
        }

        await logger.serverLog(log.type, log.operation, log.message, log.details);
    }

    /**
     * Gère le post d'une réponse passée en entrée.
     * 
     * @async
     * @method
     * @name postAnswer
     * @kind method
     * @memberof Poster
     * @param {Topic} topic
     * @param {any} answer
     * @returns {Promise<PostResponse>}
     */
    async postAnswer(topic: Topic, answer: any): Promise<PostResponse> {
        const setPosterCode = await this.setPosterAccount(); // choix d'un compte pour le post
        const postType = 'answer';
        if (setPosterCode === NO_ACCOUNT_AVAILABLE) {
            console.error('No account available for posting. Operation aborted.');
            return { code: NO_ACCOUNT_AVAILABLE, response: null, info: { postType } };
        }

        this._forumClient = new ForumClient(this._client);
        let response = await this._forumClient.postMessage(topic, answer.text); // le post de la réponse

        await this.logPostCode(response.code, postType);

        if (response.code === TOPIC_DELETED) {
            console.error('Topic deleted, aborting loop.');
            return { code: TOPIC_DELETED, response: null, info: { ...response.info, topicURL: this._topicURL, postType } };
        }

        response = await this.handleAccountIssues(response, { postTopic: { topic: topic, message: answer.text } });
        response = await this.handleRetryableIssues(response, { postTopic: { topic: topic, message: answer.text } });

        if (response.code === POST_SUCCESS) {
            if (!response.response) {
                return { code: POST_FAIL, response: null, info: { ...response.info, topicURL: this._topicURL, postType } };
            }
            console.info('Poster succeeded in posting the answer.');
            this._topicURL = response.url;
            return { code: POST_SUCCESS, response: response.response, info: { ...response.info, topicURL: this._topicURL, postType } };
        }

        return { code: response.code, response: response.response, info: { ...response.info, topicURL: this._topicURL, postType } };
    }

    /**
     * Fonction permettant le réessai d'un post si un problème a été rencontré au niveau du compte (compte banni,
     * niveau insuffisant, etc.).
     * 
     * @async
     * @method
     * @name handleAccountIssues
     * @kind method
     * @memberof Poster
     * @private
     * @param {ForumClientPostResponse} response
     * @param {{ postForum?: { forum: Forum title: string message: string } | undefined postTopic?: { topic: Topic message: string } | undefined }} { postForum, postTopic }?
     * @returns {Promise<ForumClientPostResponse>}
     */
    private async handleAccountIssues(response: ForumClientPostResponse, { postForum, postTopic }: { postForum?: { forum: Forum, title: string, message: string }, postTopic?: { topic: Topic, message: string } } = {}): Promise<ForumClientPostResponse> {
        if (!postForum && !postTopic) {
            return response;
        }

        while ([INSUFFICIENT_LEVEL, ACCOUNT_BANNED, JVC_CAPTCHA].includes(response.code)) {
            if (response.code === ACCOUNT_BANNED) {
                this._account.isBanned = true;
            }
            console.warn('Insufficient level or banned account, setting another account.');
            await this._client.logout();
            const setAccountCode = await this.setAnotherPosterAccount(); // nouveau compte pour le post

            if (setAccountCode === ALL_ACCOUNTS_USED) {
                console.error('No more accounts available.');
                return { code: ALL_ACCOUNTS_USED, response: null, info: {}, url: '' };
            }

            // on relance le post avec le nouveau compte
            if (postTopic) {
                response = await this._forumClient.postMessage(postTopic.topic, postTopic.message);
            } else if (postForum) {
                response = await this._forumClient.postTopic(postForum.forum, postForum.title, postForum.message);
            }
        }
        return response;
    }

    /**
     * Fonction permettant de relancer le post lorsque l'erreur ne nécessite pas forcément un changement de compte.
     * 
     * @async
     * @method
     * @name handleRetryableIssues
     * @kind method
     * @memberof Poster
     * @private
     * @param {ForumClientPostResponse} response
     * @param {{ postForum?: { forum: Forum title: string message: string } | undefined postTopic?: { topic: Topic message: string } | undefined }} { postForum, postTopic }?
     * @returns {Promise<ForumClientPostResponse>}
     */
    private async handleRetryableIssues(
        response: ForumClientPostResponse,
        { postForum, postTopic }: { postForum?: { forum: Forum, title: string, message: string }, postTopic?: { topic: Topic, message: string } } = {}
    ): Promise<ForumClientPostResponse> {
        if (!postForum && !postTopic) {
            return response;
        }

        while ([POSTER_TOO_FAST, NOT_CONNECTED].includes(response.code)) {
            console.warn('Poster too fast, timeout.');
            this._retriesCount++;

            if (this._retriesCount > POST_MAX_RETRIES_NUMBER) { // si trop d'essais pour un compte
                const setAccountCode = await this.setAnotherPosterAccount(); // changement de compte
                if (setAccountCode === ALL_ACCOUNTS_USED) {
                    console.error('No more accounts available.');
                    return { code: ALL_ACCOUNTS_USED, response: null, info: {}, url: '' };
                }

                this._retriesCount = 0; // remise du compteur à 0
            }

            await sleep(POST_RETRY_TIMEOUT); // cooldown

            // repost
            if (postTopic) {
                response = await this._forumClient.postMessage(postTopic.topic, postTopic.message);
            } else if (postForum) {
                response = await this._forumClient.postTopic(postForum.forum, postForum.title, postForum.message);
            }

            response = await this.handleAccountIssues(response, { postForum, postTopic }); // vérification au cas où
        }
        return response;
    }


    /**
     * Permet de changer le compte à utiliser pour la boucle, après qu'un compte a déjà été choisi.
     * 
     * @async
     * @method
     * @name setAnotherPosterAccount
     * @kind method
     * @memberof Poster
     * @private
     * @returns {Promise<number>}
     */
    private async setAnotherPosterAccount(): Promise<number> {
        this.updateAccountStatus();
        this.filterOutUsedAccount();
        const code = await this.setPosterAccount();

        return code === NO_ACCOUNT_AVAILABLE ? ALL_ACCOUNTS_USED : POST_SUCCESS;
    }

    /**
     * Ajout du compte dans les comptes à mettre à jour.
     * 
     * @method
     * @name updateAccountStatus
     * @kind method
     * @memberof Poster
     * @private
     * @returns {void}
     */
    private updateAccountStatus(): void {
        const index = this._accountsToUpdate.findIndex(a => a.id === this._account.id);
        this._accountsToUpdate[index] = this._account;
    }

    /**
     * Retrait du compte des comptes disponibles pour le post.
     * 
     * @method
     * @name filterOutUsedAccount
     * @kind method
     * @memberof Poster
     * @private
     * @returns {void}
     */
    private filterOutUsedAccount(): void {
        this._availableAccounts = this._availableAccounts.filter(account => account.id !== this._account.id);
    }

    /**
     * Fonction permettant de choisir un compte pour le post de la boucle.
     * 
     * @async
     * @method
     * @name setPosterAccount
     * @kind method
     * @memberof Poster
     * @private
     * @returns {Promise<number>}
     */
    private async setPosterAccount(): Promise<number> {
        for (const account of this._availableAccounts) {
            const accountInfo = await this.fetchAccountInfo(account); // récupération des informations du compte

            if (this.isAccountValid(accountInfo)) {
                const client = new Client(account.username, account.password);
                if (await this.loginClient(client)) { // connexion
                    this._account = account;
                    this._client = client;
                    return POST_SUCCESS;
                }
                await client.logout();
            }
        }
        return NO_ACCOUNT_AVAILABLE; // plus de compte disponible : tous bannis ou de niveau insuffisant ou supprimés
    }

    /**
     * Parsing des informations du compte et ajout dans la liste des comptes à mettre à jour.
     * 
     * @async
     * @method
     * @name fetchAccountInfo
     * @kind method
     * @memberof Poster
     * @private
     * @param {Account} account
     * @returns {Promise<any>}
     */
    private async fetchAccountInfo(account: Account): Promise<any> {
        const { existence, isBanned, level } = await Client.getAccountInfos(account.username);
        account.isBanned = isBanned;
        account.level = level || 0;
        account.unusable = !existence;

        this.updateAccountStatusList(account);
        return { existence, isBanned, level };
    }

    /**
     * Renvoie true si le compte peut être utilisé pour un post.
     * 
     * @method
     * @name isAccountValid
     * @kind method
     * @memberof Poster
     * @private
     * @param {any} accountInfo
     * @returns {boolean}
     */
    private isAccountValid(accountInfo: any): boolean {
        return accountInfo.existence && !accountInfo.isBanned && !accountInfo.unusable;
    }

    /**
     * Renvoie true si le client indique que le compte peut être utilisé pour un post.
     * 
     * @async
     * @method
     * @name loginClient
     * @kind method
     * @memberof Poster
     * @private
     * @param {Client} client
     * @returns {Promise<boolean>}
     */
    private async loginClient(client: Client): Promise<boolean> {
        const { code } = await client.login();
        if (code === LOGIN_SUCCESS) {
            const { topicLimitReached, messageLimitReached } = await client.checkLevel(); // vérification des niveaux
            return !topicLimitReached && !messageLimitReached; // aucune limite de niveau
        }
        return false;
    }

    /**
     * Modifie le tableau des comptes à mettre à jour pour y inclure la dernière version détectée du compte.
     * 
     * @method
     * @name updateAccountStatusList
     * @kind method
     * @memberof Poster
     * @private
     * @param {Account} account
     * @returns {void}
     */
    private updateAccountStatusList(account: Account): void {
        const index = this._accountsToUpdate.findIndex(a => a.id === account.id);
        if (index === -1) {
            this._accountsToUpdate.push(account);
        } else {
            this._accountsToUpdate[index] = account;
        }
    }

    /**
     * Fonction gérant le post du topic associé à la boucle.
     * 
     * @async
     * @method
     * @name postTopic
     * @kind method
     * @memberof Poster
     * @returns {Promise<PostResponse>}
     */
    async postTopic(): Promise<PostResponse> {
        const setPosterCode = await this.setPosterAccount(); // choix d'un compte pour le post
        const postType = 'topic';
        if (setPosterCode === NO_ACCOUNT_AVAILABLE) {
            console.error('No account available for posting. Operation aborted.');
            return { code: NO_ACCOUNT_AVAILABLE, response: null, info: { postType } };
        }

        this._forumClient = new ForumClient(this._client);

        console.info(`Posting topic for loop ${JSON.stringify(this._loop)} with client ${JSON.stringify(this._client.getCredentials())}.`);
        const forum = await Forum.create(this._loop.forumId); // création d'un objet Forum pour le post
        let response = await this._forumClient.postTopic(forum, this._loop.title, this._loop.first_message);

        await this.logPostCode(response.code, postType); // log en fonction du code reçu

        response = await this.handleAccountIssues(response, { postForum: { forum: forum, title: this._loop.title, message: this._loop.first_message } });
        response = await this.handleRetryableIssues(response, { postForum: { forum: forum, title: this._loop.title, message: this._loop.first_message } });

        if (response.code === POST_SUCCESS) {
            if (!response.response) {
                return { code: POST_FAIL, response: null, info: { ...response.info, topicURL: this._topicURL, postType } };
            }
            console.info('Poster succeeded in posting the topic.');
            this._topicURL = response.url;
            return { code: POST_SUCCESS, response: response.response, info: { ...response.info, topicURL: this._topicURL, postType } };
        }

        return { code: response.code, response: response.response, info: { ...response.info, topicURL: this._topicURL, postType } };
    }
}

export default Poster;