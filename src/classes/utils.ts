import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import urllib from 'url';
import { logger } from './Logger.js';

const PARTNER_KEY = '550c04bf5cb2b';
const HMAC_SECRET = 'd84e9e5f191ea4ffc39c22d11c77dd6c';
const DOMAIN = 'api.jeuxvideo.com';
const API_VERSION = 4;

/**
 * Fonction qui envoie une requête avec axios à partir des options passées en argument.
 * 
 * @async
 * @function
 * @name handleRequest
 * @kind function
 * @param {object} options
 * @returns {Promise<AxiosResponse | null>} : réponse d'Axios ou null si erreur
 */
async function handleRequest(options: object) : Promise<AxiosResponse | null> {
    try {
        const res = await axios(options);
        const resMsg = res.data;
        const resMsgString = typeof resMsg === 'object' ? JSON.stringify(resMsg) : resMsg;

        if (res.status >= 200 && res.status < 300) {
            logger.info(`Server responded with status ${res.status} and message ${resMsgString}.`);
        } else {
            logger.warn(`Server responded with status ${res.status} and message ${resMsgString}.`);
        }

        return res;

    } catch (error) {
        if (error.response) {
            const resMsgString = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.text ;
            logger.warn(`Server responded with status ${error.response.status} and message ${resMsgString}.`);
            return error.response;
        } else if (error.request) {
            logger.error('No response received from the server.', true);
        } else {
            logger.error('Error in setting up request.', true);
        }
        logger.error(error.message);
        return null;
    }
}

/**
 * Génération du header Jvc-Authorization requis lors des calls à l'API de JVC.
 * 
 * @function
 * @name authHeader
 * @kind function
 * @param {string} path
 * @param {string} method?
 * @param {Record<string} params?
 * @param {any} string> | null
 * @returns {string}
 */
function authHeader(path : string, method : string = 'GET', params: Record<string, string> | null = null) : string {
    const date = new Date().toISOString();
    let parsedUrl = new urllib.URL(`https://${DOMAIN}/v${API_VERSION}/${path}`);
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface CallOptions {
    method?: string;
    params?: Record<string, string> | null;
    data?: any;
    cookies?: Record<string, string> | null;
    headers?: Record<string, string> | null;
}

/**
 * Fonction qui gère les calls à l'API avant d'appeler handleRequest.
 * 
 * @async
 * @function
 * @name callApi
 * @kind function
 * @param {string} path
 * @param {CallOptions} { method, params, data, cookies, headers }?
 * @returns {Promise<AxiosResponse | null>}
 */
async function callApi(path: string, { method = 'GET', params = null, data = null, cookies = null, headers = null }: CallOptions = {}): Promise<AxiosResponse | null> {
    const url = `https://${DOMAIN}/v${API_VERSION}/${path}`;
    const jvAuth = authHeader(path, method, params);
    const reqHeaders = {
        ...headers,
        "Jvc-Authorization": jvAuth,
        "Content-Type": "application/json",
        "jvc-app-platform": "Android",
        "jvc-app-version": "338",
        "user-agent": "JeuxVideo-Android/338",
        "host": "api.jeuxvideo.com"
    };

    const options = {
        url: url,
        method: method,
        headers: {
            ...reqHeaders,
            ...(cookies && { 'Cookie': Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ') })
        },
        params: params,
        data: data ? JSON.stringify(data) : undefined,
    };

    logger.info(`Creating request with following args: ${JSON.stringify(options)}`);

    try {
        const response = await handleRequest(options);
        return response;
    } catch (error) {
        logger.error('Request failed', true);
        logger.error(error.message);
        return null;
    }
}

/**
 * Fonction qui gère les calls classiques avant d'appeler handleRequest.
 * 
 * @async
 * @function
 * @name call
 * @kind function
 * @param {string} url
 * @param {CallOptions} { method, params, data, cookies, headers }?
 * @returns {Promise<AxiosResponse | null>}
 */
async function call(url: string, { method = 'GET', params = null, data = null, cookies = null, headers = null }: CallOptions = {}): Promise<AxiosResponse | null>{
    if (!headers) {
        headers = {};
    }
    
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    let parsedData: string | undefined;

    if (data && headers['Content-Type'] === 'application/json') {
        parsedData = JSON.stringify(data);
    } else if (data) {
        parsedData = new URLSearchParams(data).toString();
    }

    const options = {
        url: url,
        method: method,
        headers: {
            ...headers,
            ...(cookies && { 'Cookie': Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ') })
        },
        params: params,
        data: parsedData,
    };

    logger.info(`Creating request with following args: ${JSON.stringify(options)}`);

    try {
        const res = await handleRequest(options);
        return res;
    } catch (error) {
        logger.error('Request failed', true);
        logger.error(error.message);
        return null;
    }
}

export {
    sleep,
    call,
    callApi
};
