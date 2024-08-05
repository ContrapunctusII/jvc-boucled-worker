import { Account } from '../interfaces/Account.js';
import { logger } from '../classes/Logger.js';
import { getAccounts, getLoops, writeAccountsToJSON, writeLoopsToJSON } from './utils.js';
import { DELETION_SUCCESS, DELETION_FAILED, JSON_ERROR } from '../vars.js';

async function removeAccountFromJSON(account: Account): Promise<number> {
    logger.info(`Removing account ${JSON.stringify(account)} from JSON.`);
    const accounts = await getAccounts(a => a.id !== account.id);
    const code = await writeAccountsToJSON(accounts);
    return code;
}

/**
 * Lorsqu'un compte est supprimé, retire ce compte des boucles avec lesquelles il était associé.
 * 
 * @async
 * @function
 * @name synchronizeAccountRemovalWithLoops
 * @kind function
 * @param {Account} account
 * @returns {Promise<number>}
 */
async function synchronizeAccountRemovalWithLoops(account: Account): Promise<number> {
    const loops = await getLoops();
    for (const loop of loops) {
        if (loop.accounts.map(a => a.id).includes(account.id)) {
            loop.accounts = loop.accounts.filter(a => a.id !== account.id);
        }
    }
    const code = await writeLoopsToJSON(loops);
    return code;
}

interface AccountDeletionResult {
    code: number;
    username: string;
}
/**
 * Gère la suppression du compte des fichiers et des boucles associées.
 * 
 * @async
 * @function
 * @name handleAccountDeletion
 * @kind function
 * @param {number} id
 * @returns {Promise<AccountDeletionResult>}
 */
async function handleAccountDeletion(id: number): Promise<AccountDeletionResult> {
    const accounts = await getAccounts(a => a.id === id);
    if (!accounts || accounts.length === 0) {
        logger.error('Had an issue reading/parsing/writing JSON. Deletion aborted.', true);
        logger.serverLog('erreur', `suppression du compte ${id}`, 'JSON_ERROR', 'Une erreur a été rencontrée en lisant ou écrivant dans le fichier JSON. Veuillez vérifier ce fichier.');
        return { code: DELETION_FAILED, username: null };
    }
    const account = accounts[0];
    logger.info(`Removing account ${JSON.stringify(account)}.`);
    const JSONRemoveCode = await removeAccountFromJSON(account);
    if (JSONRemoveCode === JSON_ERROR) {
        logger.error('Had an issue reading/parsing/writing JSON. Deletion aborted.', true);
        logger.serverLog('erreur', `suppression du compte ${account.username}`, 'JSON_ERROR', 'Une erreur a été rencontrée en lisant ou écrivant dans le fichier JSON. Veuillez vérifier ce fichier.');
        return { code: DELETION_FAILED, username: account.username };
    }

    const loopsSynchroCode = await synchronizeAccountRemovalWithLoops(account);
    if (loopsSynchroCode === JSON_ERROR) {
        logger.error('Had an issue reading/parsing/writing JSON. Deletion aborted.', true);
        logger.serverLog('erreur', `suppression du compte ${account.username}`, 'JSON_ERROR', 'Une erreur a été rencontrée en lisant ou écrivant dans le fichier JSON. Veuillez vérifier ce fichier.');
        return { code: DELETION_FAILED, username: account.username };
    }

    logger.info('Account removed with success.');
    logger.serverLog('info', `suppression du compte ${account.username}`, 'SUCCESS', 'Le compte a été supprimé de la base de données avec succès.');
    return { code: DELETION_SUCCESS, username: account.username };
}

export { handleAccountDeletion };