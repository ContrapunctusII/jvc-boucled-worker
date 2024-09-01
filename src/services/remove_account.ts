import Account from '../interfaces/Account.js';
import logger from '../classes/Logger.js';
import { DELETION_SUCCESS, DELETION_FAIL, D1_ERROR, D1_SUCCESS } from '../vars.js';
import Loop from '../interfaces/Loop.js';
import { deleteAccount, readAccounts, readLoops, updateLoop } from '../database.js';
import { areAllAccountsBanned, reMapLoopAccountsOrder } from './handle_loops.js';

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
    const loops = await readLoops((l: Loop) => l.accounts.map(a => a.id).includes(account.id));
    const codes = [];
    for (const loop of loops) {
        loop.accounts = loop.accounts.filter(a => a.id !== account.id);
        loop.accounts = reMapLoopAccountsOrder(loop.accounts); // pour qu'il n'y ait pas de "trou" dans l'indexation des comptes
        loop.disabled = areAllAccountsBanned(loop.accounts);

        const code = await updateLoop(loop);
        codes.push(code);
    }
    return codes.every(c => c === D1_SUCCESS) ? D1_SUCCESS : D1_ERROR;
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
    const accounts = await readAccounts((a: Account) => a.id === id);
    const D1ErrorStr = 'Une erreur a été rencontrée en lisant ou écrivant dans la base de données D1.';

    if (!accounts || accounts.length === 0) {
        console.error('Had an issue reading D1. Deletion aborted.');
        await logger.serverLog('erreur', `suppression du compte ${id}`, 'D1_ERROR', `${D1ErrorStr} Il est probable que le compte d'ID ${id} n'existe pas.`);
        return { code: DELETION_FAIL, username: '' };
    }
    const account = accounts[0];
    console.info(`Removing account ${JSON.stringify(account)}.`);

    const D1RemoveCode = await deleteAccount(account);
    if (D1RemoveCode === D1_ERROR) {
        console.error('Had an issue writing into D1. Deletion aborted.');
        await logger.serverLog('erreur', `suppression du compte ${account.username}`, 'D1_ERROR', D1ErrorStr);
        return { code: DELETION_FAIL, username: account.username };
    }

    const loopsSynchCode = await synchronizeAccountRemovalWithLoops(account);
    if (loopsSynchCode === D1_ERROR) {
        console.error('Had an issue writing into D1. Deletion aborted.');
        await logger.serverLog('erreur', `suppression du compte ${account.username}`, 'D1_ERROR', D1ErrorStr);
        return { code: DELETION_FAIL, username: account.username };
    }

    console.info('Account removed with success.');
    await logger.serverLog('info', `suppression du compte ${account.username}`, 'DELETION_SUCCESS', 'Le compte a été supprimé de la base de données avec succès.');
    return { code: DELETION_SUCCESS, username: account.username };
}

export { handleAccountDeletion };