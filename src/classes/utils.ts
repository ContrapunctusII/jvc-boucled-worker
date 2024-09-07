import crypto from 'node:crypto';
import { getProxyURL } from '../database';

// variables nécessaires à la création du header Jvc-Authorization
const PARTNER_KEY = '550c04bf5cb2b';
const HMAC_SECRET = 'd84e9e5f191ea4ffc39c22d11c77dd6c';
const DOMAIN = 'api.jeuxvideo.com';
const API_VERSION = 4;

/**
 * Envoie une requête avec fetch selon les options passées en entrée.
 * 
 * @async
 * @function
 * @name handleRequest
 * @kind function
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<globalThis.Response | null>}
 */
async function handleRequest(url: string, options: RequestInit): Promise<globalThis.Response | null> {
    try {
        console.info('Sending request:', url, options);
        const res = await fetch(url, options);
        return res;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Génère le header Jvc-Authorization requis pour envoyer des requêtes à l'API de JVC.
 * 
 * @function
 * @name authHeader
 * @kind function
 * @param {string} path
 * @param {string} method?
 * @param {Record<string>} params?
 * @returns {string}
 */
function authHeader(path: string, method: string = 'GET', params: Record<string, string> | null = null): string {
    const date = new Date().toISOString();
    const parsedUrl = new URL(`https://${DOMAIN}/v${API_VERSION}/${path}`); // construction de l'URL cible

    if (params) {
        parsedUrl.search = new URLSearchParams(params).toString();
    }

    const stringToHash = [
        PARTNER_KEY,
        date,
        method,
        parsedUrl.host,
        parsedUrl.pathname + (parsedUrl.search ? '' : '\n')
    ];

    if (parsedUrl.search) {
        stringToHash.push(parsedUrl.search);
    }

    const signature = crypto.createHmac('sha256', HMAC_SECRET)
        .update(stringToHash.join('\n'))
        .digest('hex');

    return `PartnerKey=${PARTNER_KEY}, Signature=${signature}, Timestamp=${date}`;
}

/**
 * Cooldown de <ms> millisecondes.
 * 
 * @function
 * @name sleep
 * @kind function
 * @param {number} ms
 * @returns {Promise<unknown>}
 */
export function sleep(ms: number): Promise<unknown> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface CallOptions {
    method?: string; // 'GET', 'PUT', 'POST', 'DELETE', 'OPTION', ETC.
    params?: Record<string, string>; // objet contenant les paramètres à ajouter à la requête
    data?: any; // corps de la requête
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    useProxy?: boolean;
}

/**
 * Fonction permettant d'appeler l'API de JVC.
 * 
 * @async
 * @function
 * @name callApi
 * @kind function
 * @param {string} path
 * @param {CallOptions} { method, params, data, cookies, headers }?
 * @returns {Promise<globalThis.Response | null>}
 */
export async function callApi(path: string, { method = 'GET', params = {}, data = {}, cookies = {}, headers = {}, useProxy = false }: CallOptions = {}): Promise<globalThis.Response | null> {
    let url = `https://${DOMAIN}/v${API_VERSION}/${path}` + (Object.keys(params).length !== 0 ? '?' + new URLSearchParams(params).toString() : '');

    if (useProxy) {
        const proxy = await getProxyURL();
        url = `${proxy}/${url}`;
    }

    const jvAuth = authHeader(path, method, params); // construction du header secret
    const reqHeaders = {
        ...headers,
        "Jvc-Authorization": jvAuth,
        "Content-Type": "application/json",
        "jvc-app-platform": "Android",
        "jvc-app-version": "338",
        "user-agent": "JeuxVideo-Android/338",
        "host": "api.jeuxvideo.com"
    };

    const options: RequestInit = {
        method: method,
        headers: {
            ...reqHeaders,
            ...(cookies && { 'Cookie': Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ') }) // ajout des cookies en tant que headers
        },
        body: data && method !== 'GET' ? JSON.stringify(data) : undefined, // body au format JSON
    };

    try {
        const response = await handleRequest(url, options);
        return response;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Envoie une requête à une page du site www.jeuxvideo.com.
 * 
 * @async
 * @function
 * @name call
 * @kind function
 * @param {string} url
 * @param {CallOptions} { method, params, data, cookies, headers }?
 * @returns {Promise<globalThis.Response | null>}
 */
export async function call(url: string, { method = 'GET', params = {}, data = {}, cookies = {}, headers = {}, useProxy = false }: CallOptions = {}): Promise<globalThis.Response | null> {
    if (!headers) {
        headers = {};
    }

    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'; // JSON envoyé par défaut
    }

    if (useProxy) {
        const proxy = await getProxyURL();
        url = `${proxy}/${url}`;
    }

    let parsedData: string | undefined;

    if (data && headers['Content-Type'] === 'application/json') {
        parsedData = JSON.stringify(data);
    } else if (data) {
        parsedData = new URLSearchParams(data).toString(); // URL encoding si pas de JSON
    }

    const urlWithParams = url + (Object.keys(params).length !== 0 ? '?' + new URLSearchParams(params).toString() : '');

    const options: RequestInit = {
        method: method,
        headers: {
            ...headers,
            ...(cookies && { 'Cookie': Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ') }), // ajout des cookies dans les headers
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.3"
        },
        body: parsedData && method !== 'GET' ? parsedData : undefined,
    };

    try {
        const res = await handleRequest(urlWithParams, options);
        return res;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Renvoie la date au fuseau horaire de Paris.
 * 
 * @function
 * @name getParisDate
 * @kind function
 * @returns {Date}
 * @exports
 */
export function getParisDate(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
}