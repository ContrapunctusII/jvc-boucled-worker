import { Loop } from "../interfaces/Loop.js";
import { getLoops, writeLoopsToJSON, getAccounts, writeAccountsToJSON } from './utils.js';
import { logger } from '../classes/Logger.js';
import { DELETION_SUCCESS, DELETION_FAILED, JSON_ERROR } from '../vars.js';

async function removeLoopFromJSON(loop: Loop): Promise<number> {
    logger.info(`Removing loop ${JSON.stringify(loop)} from JSON.`);
    const loops = await getLoops((l: Loop) => l.id !== loop.id);
    const code = await writeLoopsToJSON(loops);
    return code;
}

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
    const accounts = await getAccounts();
    for (const account of accounts) {
        if (account.loops.map(l => l.id).includes(loop.id)) {
            account.loops = account.loops.filter(l => l.id !== loop.id);
        }
    }
    const code = await writeAccountsToJSON(accounts);
    return code;
}

interface LoopDeletionResult {
    code: number;
    name: string;
}

/**
 * Gère la suppression de la boucle des fichiers et des comptes associés.
 * 
 * @async
 * @function
 * @name handleLoopDeletion
 * @kind function
 * @param {number} id
 * @returns {Promise<LoopDeletionResult>}
 */
async function handleLoopDeletion(id: number): Promise<LoopDeletionResult> {
    const loops = await getLoops(l => l.id === id);
    if (!loops || loops.length === 0) {
        logger.error('Had an issue reading/parsing/writing JSON. Deletion aborted.', true);
        logger.serverLog('erreur', `suppression de la boucle ${id}`, 'JSON_ERROR', 'Une erreur a été rencontrée en lisant ou écrivant dans le fichier JSON. Veuillez vérifier le contenu de ce fichier.');
        return { code: DELETION_FAILED, name: null };
    }
    const loop = loops[0];
    logger.info(`Removing loop ${JSON.stringify(loop)}.`);
    const JSONRemoveCode = await removeLoopFromJSON(loop);
    if (JSONRemoveCode === JSON_ERROR) {
        logger.error('Had an issue reading/parsing/writing JSON. Deletion aborted.', true);
        logger.serverLog('erreur', `suppression de la boucle ${loop.name}`, 'JSON_ERROR', 'Une erreur a été rencontrée en lisant ou écrivant dans le fichier JSON. Veuillez vérifier le contenu de ce fichier.');
        return { code: DELETION_FAILED, name: loop.name };
    }

    const loopsSynchroCode = await synchronizeLoopRemovalWithAccounts(loop);
    if (loopsSynchroCode === JSON_ERROR) {
        logger.error('Had an issue reading/parsing/writing JSON. Deletion aborted.', true);
        logger.serverLog('erreur', `suppression de la boucle ${loop.name}`, 'JSON_ERROR', 'Une erreur a été rencontrée en lisant ou écrivant dans le fichier JSON. Veuillez vérifier le contenu de ce fichier.');
        return { code: DELETION_FAILED, name: loop.name };
    }

    logger.info('Account removed with success.');
    logger.serverLog('info', `suppression de la boucle ${loop.name}`, 'SUCCESS', 'La boucle a été supprimée de la base de données avec succès.');
    return { code: DELETION_SUCCESS, name: loop.name };
}

export { handleLoopDeletion };