import Loop from "../interfaces/Loop.js";
import logger from '../classes/Logger.js';
import { DELETION_SUCCESS, DELETION_FAIL, D1_ERROR, D1_SUCCESS } from '../vars.js';
import { deleteLoop, readAccounts, readLoops, updateAccount } from "../database.js";
import Account, { MiniLoop } from "../interfaces/Account.js";

/**
 * Retire la boucle à supprimer des comptes où elle est associée.
 * 
 * @async
 * @function
 * @name synchronizeLoopRemovalWithAccounts
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<number>}
 */
async function synchronizeLoopRemovalWithAccounts(loop: Loop): Promise<number> {
    const accounts = await readAccounts((a: Account) => a.loops.map((l: MiniLoop) => l.id).includes(loop.id));
    const codes = [];
    for (const account of accounts) {
        account.loops = account.loops.filter((l: MiniLoop) => l.id !== loop.id);
        const code = await updateAccount(account);
        codes.push(code);
    }
    return codes.every(c => c === D1_SUCCESS) ? D1_SUCCESS : D1_ERROR;
}

interface LoopDeletionResult {
    code: number;
    name: string; // nom de la boucle
}

/**
 * Gère la suppression de la boucle de la base de données et des comptes associés.
 * 
 * @async
 * @function
 * @name handleLoopDeletion
 * @kind function
 * @param {number} id
 * @returns {Promise<LoopDeletionResult>}
 */
export async function handleLoopDeletion(id: number): Promise<LoopDeletionResult> {
    const loops = await readLoops((l: Loop) => l.id === id);
    const D1ErrorStr = 'Une erreur a été rencontrée en lisant ou écrivant dans la base de données D1.';
    const D1ErrorStrConsole = 'Had an issue reading or writing in D1. Deletion aborted.';
    if (!loops || loops.length === 0) {
        console.error(D1ErrorStrConsole);
        await logger.serverLog('erreur', `suppression de la boucle ${id}`, 'D1_ERROR', `${D1ErrorStr} Il est probable que la boucle d'ID ${id} n'existe pas.`);
        return { code: DELETION_FAIL, name: '' };
    }
    const loop = loops[0];
    console.info(`Removing loop ${JSON.stringify(loop)}.`);

    const D1RemoveCode = await deleteLoop(loop);
    if (D1RemoveCode === D1_ERROR) {
        console.error(D1ErrorStrConsole);
        await logger.serverLog('erreur', `suppression de la boucle ${loop.name}`, 'D1_ERROR', D1ErrorStr);
        return { code: DELETION_FAIL, name: loop.name };
    }

    const accountsSynchCode = await synchronizeLoopRemovalWithAccounts(loop);
    if (accountsSynchCode === D1_ERROR) {
        console.error(D1ErrorStrConsole);
        await logger.serverLog('erreur', `suppression de la boucle ${loop.name}`, 'D1_ERROR', D1ErrorStr);
        return { code: DELETION_FAIL, name: loop.name };
    }

    console.info('Account removed with success.');
    await logger.serverLog('info', `suppression de la boucle ${loop.name}`, 'DELETION_SUCCESS', 'La boucle a été supprimée de la base de données avec succès.');
    return { code: DELETION_SUCCESS, name: loop.name };
}