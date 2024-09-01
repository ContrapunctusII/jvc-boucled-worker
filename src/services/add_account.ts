import Client from '../classes/Client.js';
import Account from '../interfaces/Account.js';
import { insertAccount, readAccounts } from '../database.js';
import {
    JVC_COOLDOWN, INEXISTENT_ACCOUNT, INSUFFICIENT_LEVEL, WRONG_PASSWORD, ADDING_FAIL,
    ACCOUNT_ALREADY_REGISTERED, LOGIN_FAIL, MIN_LEVEL, ADDING_SUCCESS, D1_ERROR,
    REQUEST_SUCCESS
} from '../vars.js';
import logger from '../classes/Logger.js';

/**
 * Requête à la base de données pour savoir si un compte porte le même nom.
 * 
 * @async
 * @function
 * @name isAccountRedundant
 * @kind function
 * @param {string} username
 * @returns {Promise<boolean | null>}
 */
async function isAccountRedundant(username: string): Promise<boolean | null> {
    try {
        const accounts = await readAccounts((a: Account) => a.username === username);
        const answer = accounts.length > 0;

        return answer;
    } catch (err) {
        return null;
    }
}

interface loginResponse {
    code: number;
    account: Account;
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
async function fetchAccountInfos(username: string, password: string): Promise<loginResponse> {
    const client = new Client(username, password);
    const { code, response } = await client.login();
    if (code === WRONG_PASSWORD) {
        await client.logout();
        return { code: code, account: { id: 0, username: username, level: 0, isBanned: false, password: '', loops: [], unusable: true } };
    }
    if (code === LOGIN_FAIL || !response) {
        await client.logout();
        return { code: code, account: { id: 0, username: username, level: 0, isBanned: false, password: '', loops: [], unusable: false } };
    }
    if (code === JVC_COOLDOWN) {
        await client.logout();
        return { code: code, account: { id: 0, username: username, level: 0, isBanned: false, password: '', loops: [], unusable: false } };
    }
    const data: any = await response.clone().json();
    const accountID = data.id;
    const accountLevel = data.level.id;

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

    return { code: REQUEST_SUCCESS, account: accountInfos };
}

interface AccountHandlingResult {
    account: Account;
    code: number;
}

/**
 * Fonction qui gère l'ajout d'un nouveau compte dans la base de données.
 * Voir le fichier vars.ts pour la signification des codes renvoyés.
 * 
 * @async
 * @function
 * @name handleNewAccount
 * @kind function
 * @param {string} username
 * @param {string} password
 * @returns {Promise<AccountHandlingResult>}
 * @exports
 */
export async function handleNewAccount(username: string, password: string): Promise<AccountHandlingResult> {
    const isRedundant = await isAccountRedundant(username);
    const nullAccount: Account = { id: 0, username: username, password: '', level: 0, isBanned: false, loops: [], unusable: true }; // compte renvoyé par défaut si erreur
    const D1ErrorStr = 'Une erreur a été rencontrée en lisant ou écrivant dans la base de données D1.';

    if (isRedundant === null) {
        await logger.serverLog('erreur', `ajout du compte ${username}`, 'D1_ERROR', D1ErrorStr);
        return { account: nullAccount, code: ADDING_FAIL };
    }
    else if (isRedundant) {
        await logger.serverLog('attention', `ajout du compte ${username}`, 'ACCOUNT_ALREADY_EXISTENT', `Le compte ${username} est déjà présent dans la base de données et ne peut y être ajouté.`);
        return { account: nullAccount, code: ACCOUNT_ALREADY_REGISTERED };
    }
    const { existence, isBanned, level } = await Client.getAccountInfos(username);

    if (existence === null) {
        // la requête a raté
        await logger.serverLog('attention', `ajout du compte ${username}`, 'REQUEST_ERROR', "Erreur inconnue rencontrée lors de la requête visant à obtenir les informations du compte à ajouter.");
        return { account: nullAccount, code: ADDING_FAIL };
    }
    else if (!existence) {
        await logger.serverLog('attention', `ajout du compte ${username}`, 'INEXISTENT_JVC_ACCOUNT', "Le compte spécifié n'existe pas sur JVC.");
        return { account: nullAccount, code: INEXISTENT_ACCOUNT };
    }

    const { code, account } = await fetchAccountInfos(username, password);
    if (account.unusable) {
        await logger.serverLog('attention', `ajout du compte ${username}`, 'WRONG_PASSWORD', "Le mot de passe fourni est incorrect.");
        return { account: nullAccount, code: WRONG_PASSWORD };
    }
    if (code === JVC_COOLDOWN) {
        await logger.serverLog('attention', `ajout du compte ${username}`, 'JVC_COOLDOWN', "JVC exige un délai d'attente avant une nouvelle requête. Réessayez plus tard.");
        return { account: nullAccount, code: JVC_COOLDOWN };
    }
    if (account.id === 0) {
        await logger.serverLog('attention', `ajout du compte ${username}`, 'REQUEST_ERROR', "Erreur inconnue rencontrée lors de la requête visant à obtenir les informations du compte à ajouter.");
        return { account: nullAccount, code: ADDING_FAIL };
    }

    account.isBanned = isBanned;
    if (account.level && account.level < MIN_LEVEL) {
        await logger.serverLog('attention', `ajout du compte ${username}`, 'INSUFFICIENT_LEVEL', `Le compte à ajouter n'a pas atteint le niveau ${MIN_LEVEL} et n'est pas accepté en raisons des limitations techniques que JVC lui imposerait.`);
        return { account: nullAccount, code: INSUFFICIENT_LEVEL };
    }

    if (account.isBanned) {
        account.level = 0;
    }

    const saveCode = await insertAccount(account);

    if (saveCode === D1_ERROR) {
        await logger.serverLog('erreur', `ajout du compte ${username}`, 'D1_ERROR', D1ErrorStr);
        return { account: account, code: ADDING_FAIL };
    }

    await logger.serverLog('info', `ajout du compte ${username}`, 'ADDING_SUCCESS', "Le compte a bien été ajouté à la base de données.");
    return { account: account, code: ADDING_SUCCESS };
}

interface RouterAccountResult {
    resultStr: string;
    statusCode: number;
}

/**
 * Convertir un code obtenu à l'issue de l'ajout du compte en un message à renvoyer au frontend
 * ainsi que le code de statut HTTP associé.
 * 
 * @function
 * @name handleAccountProcessCodeForRouter
 * @kind function
 * @param {AccountHandlingResult} res
 * @returns {RouterAccountResult}
 * @exports
 */
export function handleAccountProcessCodeForRouter(res: AccountHandlingResult): RouterAccountResult {
    var resultStr: string;
    var statusCode: number;

    const username = res.account.username;

    switch (res.code) {
        case INEXISTENT_ACCOUNT:
            resultStr = `Échec de la requête : le nom d'utilisateur ${username} n'existe pas.`;
            statusCode = 404;
            break;
        case WRONG_PASSWORD:
            resultStr = "Échec de la requête : le mot de passe que vous avez entré est incorrect.";
            statusCode = 401;
            break;
        case ACCOUNT_ALREADY_REGISTERED:
            resultStr = `Échec de la requête : le compte spécifé (${username}) est déjà dans la liste.`;
            statusCode = 409;
            break;
        case INSUFFICIENT_LEVEL:
            resultStr = `Échec de la requête : les comptes de niveau inférieur à 2 ne sont pas acceptés car ils sont sujets à des captchas.`;
            statusCode = 400;
            break;
        case JVC_COOLDOWN:
            resultStr = `Échec de la requête : JVC exige un temps d'attente avant une nouvelle requête. Réessayez plus tard.`;
            statusCode = 500;
            break;
        case ADDING_SUCCESS:
            resultStr = `Succès de la requête : le compte ${username} a été ajouté avec succès.`;
            statusCode = 200;
            break;
        default:
            resultStr = "Échec de la requête : erreur inconnue (typiquement erreur de requête).";
            statusCode = 500;
            break;
    }

    return { resultStr: resultStr, statusCode: statusCode };
}
