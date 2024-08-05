import { Client } from '../classes/Client.js';
import { Account } from '../interfaces/Account.js';
import { logger } from '../classes/Logger.js';
import { addAccountsToJSON, getAccounts } from '../services/utils.js';
import { JVC_COOLDOWN, INEXISTENT_ACCOUNT, INSUFFICIENT_LEVEL, WRONG_PASSWORD, JSON_ACCOUNTS_PATH, SUCCESSFULL_ACCOUNT_ADDING, FAILED_ACCOUNT_ADDING, ACCOUNT_ALREADY_REGISTERED, LOGIN_FAILED, REQUEST_FAILED } from '../vars.js';

/**
 * Requête à la base de données pour savoir si un compte porte le même nom.
 * 
 * @async
 * @function
 * @name isAccountRedundant
 * @kind function
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function isAccountRedundant(username: string): Promise<boolean | null> {
    logger.info('Checking if account is already registered in accounts.json...');
    try {
        const accounts = await getAccounts(a => a.username === username);
        const answer = accounts.length > 0;
        logger.info(`Is account redundant: ${answer}.`);

        return answer;
    } catch (err) {
        logger.error(`Error reading or parsing ${JSON_ACCOUNTS_PATH}: ${err}`, true);
        return null;
    }
}

interface loginResponse {
    code: number,
    account: Account
}

/**
 * Requête après connexion pour informations supplémentaires (dont ID).
 * 
 * @async
 * @function
 * @name fetchAccountInfos
 * @kind function
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Account>}
 */
async function fetchAccountInfos(username: string, password: string) : Promise<loginResponse> {
    logger.info('Fetching account informations...');
    const client = new Client(username, password);
    const { code, response } = await client.login();

    if (code === WRONG_PASSWORD) {
        logger.warn(`Seems like user provided wrong credentials. Server response : ${JSON.stringify(response)}.`);
        return { code: code, account: { id: null, username: username, level: null, isBanned: null, password: null, loops: [], unusable: true }};
    }
    if (code === LOGIN_FAILED) {
        logger.error('Unknown error during login in.', true);
        return { code: code, account: { id: null, username: username, level: null, isBanned: null, password: null, loops: [], unusable: null }};
    }
    if (code === JVC_COOLDOWN) {
        logger.warn('JVC wants a cooldown. User may retry again later.');
        return { code: code, account: { id: null, username: username, level: null, isBanned: null, password: null, loops: [], unusable: null }};
    }

    const accountID = response.data.id;
    const accountLevel = response.data.level.id;

    const accountInfos: Account = {
        id: accountID,
        username: username,
        level: accountLevel,
        isBanned: false,
        password: password,
        loops: [],
        unusable: false
    }

    await client.logout();

    return { code: 200, account: accountInfos };
}

interface AccountHandlingResult {
    infos: {[k: string]: any},
    code: number;
}

/**
 * Fonction qui gère l'ajout d'un nouveau compte dans la base de données. Renvoie l'un des codes suivants :
 * FAILED_ACCOUNT_ADDING : code d'erreur générique
 * ACCOUNT_ALREADY_REGISTERED_CODE : le compte existe déjà dans le fichier JSON
 * INEXISTENT_ACCOUNT_CODE : le compte n'existe pas sur JVC
 * WRONG_PASSWORD_CODE : le mot de passe renseigné est incorrect
 * JVC_COOLDOWN : JVC a refusé la requête
 * JSON_ERROR
 * SUCCESSFULL_ACCOUNT_ADDING : succès
 * 
 * @async
 * @function
 * @name handleNewAccount
 * @kind function
 * @param {string} username
 * @param {string} password
 * @returns {Promise<AccountHandlingResult>}
 */
async function handleNewAccount(username: string, password: string): Promise<AccountHandlingResult> {
    logger.info('Processing new account...', true);
    
    const isRedundant = await isAccountRedundant(username);
    
    if (isRedundant === null) {
        logger.error('Processing failed due to reading/parsing JSON error.', true);
        logger.serverLog('erreur', `ajout du compte ${username}`, 'JSON_ERROR', 'Erreur rencontrée en lisant ou parsant le fichier JSON (format JSON invalide). Veuillez analyser le contenu du fichier.');
        return { infos: {}, code: FAILED_ACCOUNT_ADDING};
    }
    else if (isRedundant) {
        logger.warn('Processing failed due to already registered account.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'ACCOUNT_ALREADY_EXISTENT', `Le compte ${username} est déjà présent dans la base de données et ne peut y être ajouté.`);
        return { infos: { username: username }, code: ACCOUNT_ALREADY_REGISTERED };
    }

    const { existence, isBanned, level } = await Client.getAccountInfos(username);

    if (existence === null) {
        logger.error('Processing failed due to request error.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'REQUEST_ERROR', "Erreur inconnue rencontrée lors de la requête visant à obtenir les informations du compte à ajouter. Voir les logs détaillés.");
        return { infos: { username: username }, code: FAILED_ACCOUNT_ADDING };
    }
    else if (!existence) {
        logger.warn('Processing failed due to inexistent username.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'INEXISTENT_JVC_ACCOUNT', "Le compte spécifié n'existe pas sur JVC.");
        return { infos: { username: username }, code: INEXISTENT_ACCOUNT };
    }

    const { code, account } = await fetchAccountInfos(username, password);
    if (account.unusable) {
        logger.warn('Processing failed due to wrong credentials.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'WRONG_PASSWORD', "Le mot de passe fourni est incorrect.");
        return { infos: { username: username }, code: WRONG_PASSWORD };
    }
    if (code === JVC_COOLDOWN) {
        logger.warn('Processing failed because JVC wants a cooldown.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'JVC_COOLDOWN', "JVC exige un délai d'attente avant une nouvelle requête. Réessayez plus tard.");
        return { infos: { username: username }, code: JVC_COOLDOWN };
    }
    if (account.unusable === null) {
        logger.error('Processing failed due to unknown error.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'REQUEST_ERROR', "Erreur inconnue rencontrée lors de la requête visant à obtenir les informations du compte à ajouter. Voir les logs détaillés.");
        return { infos:  { username: username }, code: REQUEST_FAILED };
    }

    account.isBanned = isBanned;
    if (account.level && account.level < 2) {
        logger.warn('Processing failed due to insufficient level.', true);
        logger.serverLog('attention', `ajout du compte ${username}`, 'INSUFFICIENT_LEVEL', "Le compte à ajouter n'a pas atteint le niveau 2 et n'est pas accepté en raisons des limitations techniques que JVC lui impose.");
        return { infos: { username: username }, code: INSUFFICIENT_LEVEL};
    }

    if (account.isBanned) {
        account.level = null;
    }

    const saveCode = await addAccountsToJSON([account]);
    if (saveCode === SUCCESSFULL_ACCOUNT_ADDING) {
        logger.info('New account successfully added.', true);
        logger.serverLog('info', `ajout du compte ${username}`, 'SUCCESS', "Le compte a bien été ajouté à la base de données.");
    } else {
        logger.serverLog('erreur', `ajout du compte ${username}`, 'JSON_ERROR', 'Erreur rencontrée en lisant ou parsant le fichier JSON (format JSON invalide). Veuillez analyser le contenu du fichier.');
        logger.error('Processing failed due to JSON error.', true);
    }
    return { infos: account, code: saveCode};
}

interface RouterAccountResult {
    resultStr: string,
    statusCode: number
}

function handleAccountProcessCodeForRouter(res: AccountHandlingResult): RouterAccountResult {
    var resultStr: string;
    var statusCode: number;

    switch (res.code) {
        case INEXISTENT_ACCOUNT:
            resultStr = `Échec de la requête : le nom d'utilisateur ${res.infos.username} n'existe pas.`;
            statusCode = 404;
            break;
        case WRONG_PASSWORD:
            resultStr = "Échec de la requête : le mot de passe que vous avez entré est incorrect.";
            statusCode = 401;
            break;
        case FAILED_ACCOUNT_ADDING:
            resultStr = "Échec de la requête : erreur inconnue (typiquement erreur de requête, voir les logs).";
            statusCode = 500;
            break;
        case ACCOUNT_ALREADY_REGISTERED:
            resultStr = `Échec de la requête : le compte spécifé (${res.infos.username}) est déjà dans la liste.`;
            statusCode = 409;
            break;
        case INSUFFICIENT_LEVEL:
            resultStr = `Échec de la requête : les comptes de niveau inférieur à 2 ne sont pas acceptés car ils sont sujets à des captchas.`;
            statusCode = 409;
            break;
        case JVC_COOLDOWN:
            resultStr = `Échec de la requête : JVC exige un temps d'attente avant une nouvelle requête. Réessayez plus tard.`;
            statusCode = 409;
            break;
        default:
            resultStr = `Succès de la requête : le compte ${res.infos.username} a été ajouté avec succès.`;
            statusCode = 200;
            break;
    }

    return { resultStr: resultStr, statusCode: statusCode };
}
export { handleNewAccount, handleAccountProcessCodeForRouter };