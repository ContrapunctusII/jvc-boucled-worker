import Config from "../interfaces/Config";
import { VALID_PROXY, INVALID_PROXY_URL, NOT_VERCEL_PROXY, PROXY_CHECK_FAIL, KV_SUCCESS, UPDATE_SUCCESS, KV_ERROR } from "../vars";
import { load } from "cheerio";
import logger from "../classes/Logger";
import { setProxyURL } from "../database";

/**
 * POUR LE PROXY :
 * Comme tous les workers Cloudflare envoient des requêtes avec la même IP, le proxy permet
 * de "masquer" cette IP en envoyant la requête à JVC à la place du worker.
 * Le proxy doit être un fork du repo simple-express-proxy publié par moi-même. Il est à héberger
 * sur Vercel dont les IP sont dynamiques.
 * Les requêtes utilisant le proxy sont :
 * - Les requêtes à accounts/login (API de JVC) par exemple avant un post ou lors d'un ajout de compte
 * - Les requêtes POST pour envoyer un topic
 * - Les requêtes POST pour envoyer un message
 * 
 * La réponse renvoyée par le proxy contient un header x-url dont la valeur est l'URL finale (donc 
 * après redirection) de la requête effectuée par le proxy.
 */

/**
 * Fonction qui vérifie si l'URL du proxy est valide.
 * 
 * @async
 * @function
 * @name checkProxyValidity
 * @kind function
 * @param {string} proxyURL
 * @returns {Promise<number>}
 */
export async function checkProxyValidity(proxyURL: string): Promise<number> {
    try {
        new URL(proxyURL); // pour vérifier si le formatage est correct
    } catch (err) {
        return INVALID_PROXY_URL;
    }

    if (!proxyURL.endsWith('.vercel.app') && !proxyURL.endsWith('.vercel.app/')) {
        return NOT_VERCEL_PROXY; // site pas hébergé sur vercel
    }

    try { // envoyer une requête de test pour vérifier que le site est bien un proxy
        const testUrl = `${proxyURL}?url=https://www.jeuxvideo.com`;
        const res = await fetch(testUrl);
        const text = await res.text();

        const $ = load(text);

        // si le site est un proxy il renverra le titre de la page en question
        const isTitleOK = $('title').text().includes('jeuxvideo.com');
        if (!isTitleOK) {
            return INVALID_PROXY_URL;
        }

        return VALID_PROXY;
    } catch (err: any) {
        if (err.name == 'NetworkError') {
            return INVALID_PROXY_URL;
        }
        return PROXY_CHECK_FAIL;
    }
}

interface UpdateConfigResponse {
    code: number;
}

/**
 * Fonction qui remplace les anciens paramètres du worker par de nouveaux en vérifiant
 * leur validité.
 * 
 * @async
 * @function
 * @name handleConfigUpdate
 * @kind function
 * @param {Config} config
 * @returns {Promise<UpdateConfigResponse>}
 * @exports
 */
export async function handleConfigUpdate(config: Config): Promise<UpdateConfigResponse> {
    if (!config.proxyURL) {
        return { code: INVALID_PROXY_URL };
    }
    if (config.proxyURL.endsWith('/')) {
        config.proxyURL = config.proxyURL.slice(0, -1);
    }
    const proxyCode = await checkProxyValidity(config.proxyURL);
    const operationStr = 'mise à jour des paramètres';
    if (proxyCode !== VALID_PROXY && proxyCode !== PROXY_CHECK_FAIL) {
        await logger.serverLog('attention', operationStr, 'INVALID_PROXY_URL', `L'URL "${config.proxyURL}" fournie n'est pas valide. Soit le site n'existe pas, soit il n'est pas un proxy ExpressJS hébergé sur Vercel.`);
        return { code: proxyCode };
    } else if (proxyCode === PROXY_CHECK_FAIL) {
        await logger.serverLog('erreur', operationStr, 'PROXY_CHECK_FAIL', `Une erreur inconnue a été rencontrée durant la vérification du proxy suivant : "${config.proxyURL}".`);
        return { code: proxyCode };
    }

    const KVProxyCode = await setProxyURL(config.proxyURL);
    if (KVProxyCode !== KV_SUCCESS) {
        await logger.serverLog('erreur', operationStr, 'KV_ERROR', "Erreur rencontrée en tentant d'écrire dans la base de données KV.");
        return { code: KVProxyCode };
    }

    await logger.serverLog('info', operationStr, 'UPDATE_SUCCESS', "Les paramètres du worker ont bien été mis à jour.");
    return { code: UPDATE_SUCCESS };
}

/**
 * Renvoie un statut et un message qui constitueront la réponse à envoyer au front.
 * 
 * @function
 * @name handleConfigUpdateCodeForRouter
 * @kind function
 * @param {UpdateConfigResponse} res
 * @returns {{ resultStr: string; statusCode: number; }}
 * @exports
 */
export function handleConfigUpdateCodeForRouter(res: UpdateConfigResponse): { resultStr: string, statusCode: number } {
    var resultStr: string = '';
    var statusCode: number = 200;

    switch (res.code) {
        case INVALID_PROXY_URL:
            resultStr = "L'URL que vous avez entrée n'est pas valide ou le proxy est inaccessible.";
            statusCode = 400;
            break;
        case NOT_VERCEL_PROXY:
            resultStr = "L'URL que vous avez entrée n'est pas celle d'une application déployée sur Vercel.";
            statusCode = 400;
            break;
        case PROXY_CHECK_FAIL:
            resultStr = "La vérification du proxy a échoué pour une raison inconnue.";
            statusCode = 500;
            break;
        case KV_ERROR:
            resultStr = "La mise à jour a échoué en raison d'un dysfonctionnement de la base de données";
            statusCode = 500;
            break;
        case UPDATE_SUCCESS:
            resultStr = "Les données ont bien été mises à jour."
            statusCode = 200;
            break;
        default:
            resultStr = "Échec de la mise à jour en raison d'une erreur inconnue.";
            statusCode = 500;
            break;
    }

    return { resultStr, statusCode };
}