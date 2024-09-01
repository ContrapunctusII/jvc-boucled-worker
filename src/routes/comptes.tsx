import { Context, Hono } from 'hono'
import { readAccounts } from '../database.js';
import ReactDOMServer from 'react-dom/server';
import AccountsPage from '../components/AccountsPage.js';
import { handleAccountProcessCodeForRouter, handleNewAccount } from '../services/add_account.js';
import AccountComponent from '../components/Account.js';
import { updateAccounts } from '../services/update_accounts.js';
import { UPDATE_FAIL } from '../vars.js';
import { removePasswordFromAccount, removePasswordsFromAccounts } from '../services/utils.js';

// Ce router contiendra les routes commençant par /comptes
const router = new Hono();

// Route pour afficher les comptes
router.get('/', async (c: Context): Promise<Response> => {
    try {
        const accounts = await readAccounts();
        // création de la table
        const stream = await ReactDOMServer.renderToReadableStream(<AccountsPage accounts={accounts} globalVars={{ accounts: removePasswordsFromAccounts(accounts) }} />);

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

interface AddAccountPost {
    username: string;
    password: string;
}

// Route pour ajouter un compte
router.post('/ajout-compte', async (c: Context): Promise<Response> => {
    try {
        const data = await c.req.json() as AddAccountPost;
        const handleRes = await handleNewAccount(data.username, data.password);
        const { resultStr, statusCode } = handleAccountProcessCodeForRouter(handleRes);
        let html = '';
        if (statusCode === 200) {
            // nouvelle ligne à la table
            html = ReactDOMServer.renderToStaticMarkup(<AccountComponent account={handleRes.account} />);
        }
        return c.json({ account: removePasswordFromAccount(handleRes.account), resultStr, html }, { status: statusCode });
    } catch (err: any) {
        console.error(err);
        return c.json({ resultStr: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

// Route pour mettre à jour tous les comptes
router.put('/mise-a-jour', async (c: Context): Promise<Response> => {
    try {
        const { updatedAccounts, code } = await updateAccounts();
        if (code === UPDATE_FAIL) {
            return c.json({ resultStr: 'Échec de la requête : erreur inconnue.' }, { status: 500 });
        }
        return c.json({ resultStr: `Succès de la requête : les comptes ont été mis à jour.`, accounts: removePasswordsFromAccounts(updatedAccounts) }, { status: 200 });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

export default router;