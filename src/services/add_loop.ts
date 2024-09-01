import {
    INVALID_CHAR, EMPTY_LOOP_DATA, INEXISTENT_LOOP_FORUM, LOOP_NAME_REDUNDANT,
    LOOP_TIME_REDUNDANT, ONLY_NON_STANDARD_CHARS_IN_TITLE, D1_ERROR,
    ADDING_SUCCESS, ADDING_FAIL
} from '../vars.js';
import Loop, { PreLoop } from '../interfaces/Loop.js';
import logger from '../classes/Logger.js';
import Account from '../interfaces/Account.js';
import {
    checkEmptyAttributes, generateLoopId, checkInvalidCharacter, checkLoopRedundancy,
    doesForumExist, LoopHandlingResult, addLoopToAccounts, containsOnlyAccentedOrNonAlphanumeric,
    areAllAccountsBanned, addTotalDelays
} from './handle_loops.js';
import { insertLoop, readAccounts } from '../database.js';
import { accountToMiniAccount } from './utils.js';

/**
 * Fonction qui gère l'ajout d'une boucle à la base de données.
 * Voir la signification des codes dans le fichier vars.ts.
 * 
 * @async
 * @function
 * @name handleNewLoop
 * @kind function
 * @param {PreLoop} preLoopObj
 * @returns {Promise<LoopHandlingResult>}
 * @exports
 */
export async function handleNewLoop(preLoopObj: PreLoop): Promise<LoopHandlingResult> {
    console.info(`Processing new loop with properties : ${JSON.stringify(preLoopObj)}.`);
    const D1ErrorStr = 'Une erreur a été rencontrée en lisant ou écrivant dans la base de données D1.';

    const loopObj: Loop = {
        id: generateLoopId(),
        ...preLoopObj, // le corps de la requête POST envoyé par le front
        lastPosts: [],
        accounts: [],
        disabled: false,
        answers: []
    }

    const operationStr = `ajout de la boucle ${loopObj.name}`;

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

    const { sameName, sameTime, duplicateTime, duplicateTimeLoop } = await checkLoopRedundancy(loopObj, false);
    infos = {
        duplicateTime: duplicateTime,
        duplicateTimeLoop: duplicateTimeLoop
    }

    if (sameName === null && sameTime === null) {
        console.error(`Processing failed because of unknown error.`);
        await logger.serverLog('erreur', operationStr, 'UNKNOWN_ERROR', "L'ajout de la boucle à la base de données n'a pu s'effectuer pour une raison inconnue. Veuillez consulter les logs précis.");
        return { loop: loopObj, infos: infos, code: ADDING_FAIL };
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
        return { loop: loopObj, infos: infos, code: ADDING_FAIL };
    } else if (!isForumExistent) {
        console.warn('Processing failed because specified forum does not exist.');
        await logger.serverLog('attention', operationStr, 'INEXISTENT_FORUM', `Le forum renseigné, d'ID ${loopObj.forumId}, n'existe pas.`);
        return { loop: loopObj, infos: infos, code: INEXISTENT_LOOP_FORUM };
    }

    const parsedMiniAccounts = [];
    for (const account of preLoopObj.accounts) {
        const accountObj = await readAccounts((a: Account) => a.id === account.id); // récupération de l'objet Account associé à l'ID
        if (accountObj.length === 0) { // si mauvaise ID
            return { loop: loopObj, infos: { account: account.id }, code: ADDING_FAIL };
        }
        const miniAccountObj = accountToMiniAccount(accountObj[0], account.order);
        parsedMiniAccounts.push(miniAccountObj);
    }

    loopObj.accounts = parsedMiniAccounts;
    loopObj.disabled = areAllAccountsBanned(parsedMiniAccounts);

    loopObj.answers = addTotalDelays(preLoopObj.answers);
    const saveCode = await insertLoop(loopObj);
    if (saveCode === D1_ERROR) {
        console.error('Processing failed due to D1 error.');
        await logger.serverLog('erreur', operationStr, 'D1_ERROR', D1ErrorStr);
        return { loop: loopObj, infos: infos, code: ADDING_FAIL };
    }

    const updateAccountCode = await addLoopToAccounts(loopObj);
    if (updateAccountCode === D1_ERROR) {
        console.error('Processing failed due to D1 error.');
        await logger.serverLog('erreur', operationStr, 'D1_ERROR', D1ErrorStr);
        return { loop: loopObj, infos: infos, code: ADDING_FAIL };
    }

    console.info('New loop successfully added.');
    await logger.serverLog('info', operationStr, 'ADDING_SUCCESS', 'La boucle a bien été ajoutée à la base de données.');
    return { loop: loopObj, infos: infos, code: ADDING_SUCCESS };
}