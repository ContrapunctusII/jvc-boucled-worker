import { Account } from "../interfaces/Account.js";
import { Client } from "../classes/Client.js";
import { getAccounts, writeAccountsToJSON, sleep, getLoops, writeLoopsToJSON, accountToMiniAccount } from "./utils.js";
import { logger } from "../classes/Logger.js";
import { REQUEST_FAILED, REQUEST_SUCCESS, UPDATE_SUCCESS, UPDATE_FAILED, JSON_ERROR, UPDATE_DELAY_BETWEEN_REQUESTS_MS } from '../vars.js'; 

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
    const loops = await getLoops();
    const accounts = await getAccounts();

    const updatedLoops = [];
    for (const loop of loops) {
        const updatedLoopAccounts = [];
        for (const account of loop.accounts) {
            updatedLoopAccounts.push(accounts.find(a => a.id === account.id));
        }
        if (updatedLoopAccounts.every(a => a.isBanned || a.unusable)) {
            if (loop.status === "active") {
                loop.status = "disabled";
            }
        } else if (loop.status === "disabled") {
            loop.status = "active";
        }

        loop.accounts = updatedLoopAccounts.map(accountToMiniAccount);
        updatedLoops.push(loop);
    }

    return await writeLoopsToJSON(updatedLoops);
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
 * @name updateAccount
 * @kind function
 * @param {Account} account
 * @returns {Promise<accountUpdateRes>}
 */
async function updateAccount(account: Account): Promise<accountUpdateRes> {
    try {
        const { existence, isBanned, level } = await Client.getAccountInfos(account.username);

        if (existence === null) {
            logger.error(`Request failed for account of name ${account.username}. Maintaining the status quo.`, true);
            logger.serverLog('erreur', `mise à jour de ${account.username}`, 'REQUEST_ERROR', 'Une erreur a eu lieu durant la mise à jour du compte. Voir les logs détaillés.');
            return { updatedAccount: account, code: REQUEST_FAILED };
        }
        if (existence === false) {
            logger.warn(`Seems like account of name ${account.username} no longer exists.`, true);
            logger.serverLog('attention', `mise à jour de ${account.username}`, 'INEXISTENT_ACCOUNT', "Il semble que le compte n'existe plus ; il ne sera plus utilisé.");
            account.unusable = true;
            return  { updatedAccount: account, code: REQUEST_SUCCESS };
        }

        account.isBanned = isBanned;
        account.level = level;
        logger.info(`Request succeeded. New account infos: ${JSON.stringify(account)}`);
        return { updatedAccount: account, code: REQUEST_SUCCESS };
        
    } catch (error) {
        logger.error(`Error processing account ${account.username}: ${error.message}`, true);
        return { updatedAccount: account, code: REQUEST_FAILED };
    }

}

/**
 * Mets à jour tous les comptes en appelant successivement updateAccount.
 * 
 * @async
 * @function
 * @name updateAllAccounts
 * @kind function
 * @returns {Promise<accountsUpdateRes>}
 */
async function updateAllAccounts(): Promise<accountsUpdateRes> {
    const accounts = await getAccounts();
    const updatedAccounts = [];

    let failed = false;

    if (!accounts) {
        logger.serverLog('attention', 'mise à jour des comptes', 'UPDATE_FAILED', 'Tous ou une partie des comptes n\'ont pu être mis à jour en raison d\'une erreur (voir les logs détaillés).');
        var code = UPDATE_FAILED;
        return { updatedAccounts: null, code: code };
    }

    for (const account of accounts) {
        const { updatedAccount, code } = await updateAccount(account);
        if (code !== REQUEST_SUCCESS) {
            logger.error(`Request error while updating account ${JSON.stringify(account)}.`);
            failed = true;
            updatedAccounts.push(account);
        } else {
            updatedAccounts.push(updatedAccount);
        }
        sleep(UPDATE_DELAY_BETWEEN_REQUESTS_MS);
    }

    const JSONCode = await writeAccountsToJSON(updatedAccounts);
    if (JSONCode === JSON_ERROR) {
        failed = true;
    }
    const loopsSynchCode = await synchronizeAccountsInLoop();
    if (loopsSynchCode === JSON_ERROR) {
        failed = true;
    }
    if (failed) {
        logger.serverLog('attention', 'mise à jour des comptes', 'UPDATE_FAILED', 'Tous ou une partie des comptes n\'ont pu être mis à jour en raison d\'une erreur (voir les logs détaillés).');
        var code = UPDATE_FAILED;
    } else {
        logger.serverLog('info', 'mise à jour des comptes', 'UPDATE_SUCCESS', 'Les comptes ont été mis à jour.');
        var code = UPDATE_SUCCESS;
    }
    return { updatedAccounts: updatedAccounts, code: code };
}

/**
 * Ne met à jour qu'une partie des comptes (tableau d'objets Account passé en entrée).
 * 
 * @async
 * @function
 * @name updateSomeAccounts
 * @kind function
 * @param {Array<Account>} accounts
 * @returns {Promise<accountsUpdateRes>}
 */
async function updateSomeAccounts(accounts: Array<Account>): Promise<accountsUpdateRes> {
    const allAccounts = await getAccounts();
    let failed = false;

    for (const account of accounts) {
        const index = allAccounts.findIndex(a => a.id === account.id);
        const { updatedAccount, code } = await updateAccount(account);
        if (code !== REQUEST_SUCCESS) {
            logger.error(`Request error while updating account ${JSON.stringify(account)}.`);
        } else {
            allAccounts[index] = updatedAccount;
        }
        sleep(UPDATE_DELAY_BETWEEN_REQUESTS_MS);
    }

    const JSONCode = await writeAccountsToJSON(allAccounts);
    if (JSONCode === JSON_ERROR) {
        failed = true;
    }
    const loopsSynchCode = await synchronizeAccountsInLoop();
    if (loopsSynchCode === JSON_ERROR) {
        failed = true;
    }
    if (failed) {
        logger.serverLog('attention', 'mise à jour des comptes', 'UPDATE_FAILED', 'Tous ou une partie des comptes n\'ont pu être mis à jour en raison d\'une erreur (voir les logs détaillés).');
        var code = UPDATE_FAILED;
    } else {
        logger.serverLog('info', 'mise à jour des comptes', 'UPDATE_SUCCESS', 'Les comptes ont été mis à jour.');
        var code = UPDATE_SUCCESS;
    }
    return { updatedAccounts: allAccounts, code: code };
}


export { updateAllAccounts, updateSomeAccounts };