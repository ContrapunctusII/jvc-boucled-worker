import Account, { MiniLoop } from "../interfaces/Account.js";
import Client from "../classes/Client.js";
import { sleep, accountToMiniAccount } from "./utils.js";
import logger from "../classes/Logger.js";
import { REQUEST_FAIL, REQUEST_SUCCESS, UPDATE_SUCCESS, UPDATE_FAIL, D1_SUCCESS, D1_ERROR, UPDATE_DELAY_BETWEEN_REQUESTS_MS } from '../vars.js';
import { readAccounts, readLoops, updateAccount, updateLoop } from "../database.js";
import { areAllAccountsBanned } from "./handle_loops.js";

/**
 * Modifie le statut des comptes dans les objets Loop après une mise à jour des comptes.
 * 
 * @async
 * @function
 * @name synchronizeAccountsInLoop
 * @kind function
 * @returns {Promise<number>}
 */
async function synchronizeAccountsInLoop(): Promise<number> {
    const loops = await readLoops();

    const codes: number[] = [];

    for (const loop of loops) {
        // récupération des comptes associés à la boucle
        const updatedLoopAccounts = await readAccounts((a: Account) => a.loops.map((l: MiniLoop) => l.id).includes(loop.id));
        const updatedLoopMiniAccounts = updatedLoopAccounts.map(accountToMiniAccount);

        // boucle inactive si tous les comptes sont inutilisables
        loop.disabled = areAllAccountsBanned(updatedLoopMiniAccounts);
        loop.accounts = updatedLoopMiniAccounts;
        const code = await updateLoop(loop);
        codes.push(code);
    }

    return codes.every(c => c === D1_SUCCESS) ? D1_SUCCESS : D1_ERROR; // on renvoie un succès si toutes les requêtes à la base de données ont été un succès
}

interface accountUpdateRes {
    updatedAccount: Account;
    code: number;
}

interface accountsUpdateRes {
    updatedAccounts: Array<Account>;
    code: number;
}

/**
 * Met à jour l'existence, le statut et le niveau d'un compte en envoyant une requête avec le Client.
 * 
 * @async
 * @function
 * @name getNewAccountInfos
 * @kind function
 * @param {Account} account
 * @returns {Promise<accountUpdateRes>}
 */
async function getNewAccountInfos(account: Account): Promise<accountUpdateRes> {
    try {
        const { existence, isBanned, level } = await Client.getAccountInfos(account.username);

        if (existence === null) {
            console.error(`Request failed for account of name ${account.username}. Maintaining the status quo.`);
            await logger.serverLog('erreur', `mise à jour de ${account.username}`, 'REQUEST_ERROR', 'Une erreur a eu lieu durant la mise à jour du compte.');
            return { updatedAccount: account, code: REQUEST_FAIL };
        }
        if (existence === false) {
            console.warn(`Seems like account of name ${account.username} no longer exists.`);
            await logger.serverLog('attention', `mise à jour de ${account.username}`, 'INEXISTENT_ACCOUNT', "Il semble que le compte n'existe plus ; il ne sera plus utilisé.");
            account.unusable = true;
            return { updatedAccount: account, code: REQUEST_SUCCESS };
        }

        account.isBanned = isBanned;
        account.level = level;
        console.info(`Request succeeded. New account infos: ${JSON.stringify(account)}`);
        return { updatedAccount: account, code: REQUEST_SUCCESS };

    } catch (error: any) {
        console.error(`Error processing account ${account.username}: ${error.message}`);
        return { updatedAccount: account, code: REQUEST_FAIL };
    }

}

/**
 * Modifie la base de données pour mettre à jour les comptes passés en entrée. Si rien n'est passé
 * en entrée, met à jour tous les comptes. Si la liste de comptes est vide, ne fait rien.
 * 
 * @async
 * @function
 * @name updateSomeAccounts
 * @kind function
 * @param {Array<Account>} accounts
 * @returns {Promise<accountsUpdateRes>}
 */
export async function updateAccounts(accounts: Array<Account> | null = null): Promise<accountsUpdateRes> {
    let failed = false;

    if (!accounts) {
        accounts = await readAccounts();
    } else if (accounts.length === 0) {
        return { updatedAccounts: [], code: UPDATE_SUCCESS };
    }

    for (const account of accounts) {
        const { updatedAccount, code } = await getNewAccountInfos(account); // fetch des nouvelles informations
        if (code !== REQUEST_SUCCESS) {
            console.error(`Request error while updating account ${JSON.stringify(account)}.`);
            failed = true;
        } else {
            const D1Code = await updateAccount(updatedAccount); // compte mis à jour dans D1
            if (D1Code === D1_ERROR) {
                failed = true;
            }
        }
        await sleep(UPDATE_DELAY_BETWEEN_REQUESTS_MS); // pour éviter le ban par les serveurs de JVC
    }

    const loopsSynchCode = await synchronizeAccountsInLoop();

    if (loopsSynchCode === D1_ERROR) {
        failed = true;
    }

    const usernames = accounts.map(a => a.username).join(', ')

    if (failed) {
        const errorDetails = accounts.length > 1 ? `La totalité ou une partie des comptes ${usernames} n'ont pu être mis à jour en raison d'une erreur inconnue.` : `Le compte ${usernames} n'a pu être mis à jour en raison d'une erreur inconnue.`
        await logger.serverLog('attention', 'mise à jour des comptes', 'UPDATE_FAIL', errorDetails);
        return { updatedAccounts: accounts, code: UPDATE_FAIL };
    }

    const successDetails = accounts.length > 1 ? `Les comptes ${usernames} ont été mis à jour.` : `Le compte ${usernames} a été mis à jour.`
    await logger.serverLog('info', 'mise à jour des comptes', 'UPDATE_SUCCESS', successDetails);
    return { updatedAccounts: accounts, code: UPDATE_SUCCESS };
}