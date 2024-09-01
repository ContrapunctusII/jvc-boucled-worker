import Loop, { LastPost, PreLoop } from "../interfaces/Loop";
import logger from "../classes/Logger.js";
import Account from '../interfaces/Account.js';
import { accountToMiniAccount, loopToMiniLoop } from './utils.js';
import { addTotalDelays, areAllAccountsBanned, checkEmptyAttributes, checkInvalidCharacter, checkLoopRedundancy, containsOnlyAccentedOrNonAlphanumeric, doesForumExist, LoopHandlingResult } from './handle_loops.js';
import {
    INVALID_CHAR, EMPTY_LOOP_DATA, D1_ERROR, D1_SUCCESS, INEXISTENT_LOOP_FORUM, UPDATE_SUCCESS, UPDATE_FAIL,
    LOOP_NAME_REDUNDANT, LOOP_TIME_REDUNDANT, ONLY_NON_STANDARD_CHARS_IN_TITLE
} from '../vars.js';
import { readAccounts, readLoops, updateAccount, updateLoop } from "../database.js";

/**
 * Modifie l'objet Loop attaché aux objets Account dans le cas d'une mise à jour. Soit ajout (si un nouveau compte est associé),
 * soit suppression (si un compte est supprimé de la boucle).
 * 
 * @async
 * @function
 * @name synchronizeLoopInAccounts
 * @kind function
 * @param {Loop} loop
 * @returns {Promise<number>}
 */
async function synchronizeLoopInAccounts(loop: Loop): Promise<number> {
    const loopAccountsId = loop.accounts.map(a => a.id);
    const loopMinified = loopToMiniLoop(loop);
    const accounts = await readAccounts();
    const codes = [];
    for (const account of accounts) {
        const accountLoopsId = account.loops.map(l => l.id);
        // si la boucle inclut le compte mais que le compte n'inclut pas la boucle
        if (loopAccountsId.includes(account.id) && !accountLoopsId.includes(loop.id)) {
            account.loops.push(loopMinified); // ajout de la boucle dans le compte
            // sinon, si la boucle n'inclut pas le compte mais que le compte inclut la boucle
        } else if (!loopAccountsId.includes(account.id) && accountLoopsId.includes(loop.id)) {
            account.loops = account.loops.filter(l => l.id !== loop.id); // retrait de la boucle dans le compte
            // sinon, si la boucle inclut le compte et que le compte inclut la boucle, on met à jour la boucle dans le compte
        } else if (loopAccountsId.includes(account.id)) {
            const index = account.loops.findIndex(l => l.id === loop.id);
            account.loops[index] = loopMinified;
        }
        const code = await updateAccount(account);
        codes.push(code);
    }

    return codes.every(c => c === D1_SUCCESS) ? D1_SUCCESS : D1_ERROR; // renvoie un succès si toutes les requêtes à D1 ont été un succès
}

/**
 * Met à jour une boucle avec les informations données par le client à la requête PUT /boucle/:id.
 * 
 * @async
 * @function
 * @name handleLoopUpdate
 * @kind function
 * @param {PreLoop} preLoopObj
 * @returns {Promise<LoopHandlingResult>}
 */
export async function handleLoopUpdate(preLoopObj: PreLoop): Promise<LoopHandlingResult> {
    console.info(`Processing loop update with properties : ${JSON.stringify(preLoopObj)}.`);
    const D1ErrorStr = 'Une erreur a été rencontrée en lisant ou écrivant dans la base de données D1.';

    const targetLoop = (await readLoops((l: Loop) => l.id === preLoopObj.id))[0];
    const loopObj: Loop = {
        ...preLoopObj, // le corps de la requête POST envoyé par le front
        id: preLoopObj.id ? preLoopObj.id : 0, // il devra y avoir un ID dans tous les cas
        lastPosts: targetLoop.lastPosts.map((l: LastPost) => ({ ...l, nextAnswersDate: [] })), // remise à zéro des réponses à poster pour éviter des conflits de versions
        accounts: [],
        disabled: false,
        answers: []
    }
    const operationStr = `mise à jour de la boucle ${loopObj.name}`;

    const { emptyAttr, attr } = checkEmptyAttributes(loopObj);
    var infos: { [k: string]: any } = {
        emptyAttr: emptyAttr,
        attr: attr
    }

    if (emptyAttr) {
        console.warn(`Processing failed due to blank argument: ${attr}.`);
        await logger.serverLog('attention', operationStr, 'BLANK_ARGUMENT', `L'argument "${attr}" est vide.`);
        return { loop: loopObj, infos: infos, code: EMPTY_LOOP_DATA };
    }

    const onlyNonStandardInTitle = containsOnlyAccentedOrNonAlphanumeric(loopObj.title);
    if (onlyNonStandardInTitle) {
        await logger.serverLog('attention', operationStr, 'NON_STANDARD_TITLE', 'Le titre du topic ne contient ni lettre ni chiffre.');
        return { loop: loopObj, infos: {}, code: ONLY_NON_STANDARD_CHARS_IN_TITLE };
    }

    const { invalid, attr2, char } = checkInvalidCharacter(loopObj);
    infos = {
        invalid: invalid,
        attr2: attr2,
        char: char
    }

    if (invalid) {
        console.warn(`Processing failed due to invalid character in argument ${attr2}.`)
        await logger.serverLog('attention', operationStr, 'INVALID_CHAR', `L'argument "${attr2}" contient un caractère invalide pour JVC.`);
        return { loop: loopObj, infos: infos, code: INVALID_CHAR };
    }

    const { sameName, sameTime, duplicateTime, duplicateTimeLoop } = await checkLoopRedundancy(loopObj, true);
    infos = {
        duplicateTime: duplicateTime,
        duplicateTimeLoop: duplicateTimeLoop
    }

    if (sameName === null && sameTime === null) {
        console.error(`Processing failed because of unknown error.`);
        await logger.serverLog('erreur', operationStr, 'UNKNOWN_ERROR', "La modification de la boucle dans la base de données n'a pu s'effectuer pour une raison inconnue. Veuillez consulter les logs précis.");
        return { loop: loopObj, infos: infos, code: UPDATE_FAIL };
    } else if (sameName) {
        console.warn('Processing failed because of loop name already existent.');
        await logger.serverLog('attention', operationStr, 'NAME_TAKEN', `Une boucle possède déjà le nom ${loopObj.name}.`);
        return { loop: loopObj, infos: infos, code: LOOP_NAME_REDUNDANT };
    } else if (sameTime && duplicateTimeLoop) {
        console.warn('Processing failed because of loop time already existent.');
        await logger.serverLog('attention', operationStr, 'TIME_TAKEN', `Une autre boucle (${duplicateTimeLoop.name}) est déjà programmée à l'heure ${duplicateTime}.`);
        return { loop: loopObj, infos: infos, code: LOOP_TIME_REDUNDANT };
    }

    const isForumExistent = await doesForumExist(loopObj.forumId);

    if (isForumExistent === null) {
        console.error(`Processing failed because of unknown error.`);
        await logger.serverLog('erreur', operationStr, 'REQUEST_ERROR', 'Une erreur a été rencontrée durant une requête adressée à JVC pour savoir si le forum renseigné existait.');
        return { loop: loopObj, infos: infos, code: UPDATE_FAIL };
    } else if (!isForumExistent) {
        console.warn('Processing failed because specified forum does not exist.');
        await logger.serverLog('attention', operationStr, 'INEXISTENT_FORUM', `Le forum renseigné, d'ID ${loopObj.forumId}, n'existe pas.`);
        return { loop: loopObj, infos: infos, code: INEXISTENT_LOOP_FORUM };
    }

    const parsedMiniAccounts = [];
    for (const account of preLoopObj.accounts) {
        const accountObj = await readAccounts((a: Account) => a.id === account.id); // récupération de l'objet Account associé à l'ID
        if (accountObj.length === 0) {
            return { loop: loopObj, infos: { account: account.id }, code: UPDATE_FAIL };
        }
        const miniAccountObj = accountToMiniAccount(accountObj[0], account.order);
        parsedMiniAccounts.push(miniAccountObj);
    }

    loopObj.accounts = parsedMiniAccounts;
    loopObj.disabled = areAllAccountsBanned(parsedMiniAccounts);

    loopObj.answers = addTotalDelays(preLoopObj.answers);

    const saveCode = await updateLoop(loopObj);
    if (saveCode === D1_ERROR) {
        console.error('Processing failed due to SQL error.');
        await logger.serverLog('erreur', operationStr, 'D1_ERROR', D1ErrorStr);
        return { loop: loopObj, infos: infos, code: UPDATE_FAIL };
    }

    const updateAccountCode = await synchronizeLoopInAccounts(loopObj);
    if (updateAccountCode === D1_ERROR) {
        console.error('Processing failed due to SQL error.');
        await logger.serverLog('erreur', operationStr, 'D1_ERROR', D1ErrorStr);
        return { loop: loopObj, infos: infos, code: UPDATE_FAIL };
    }

    console.info('New loop successfully added.');
    await logger.serverLog('info', operationStr, 'UPDATE_SUCCESS', 'La boucle a bien été modifiée dans la base de données.');
    return { loop: loopObj, infos: infos, code: UPDATE_SUCCESS };
}