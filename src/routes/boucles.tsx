import { Hono, Context } from 'hono';
import { readAccounts, readLoops } from '../database.js';
import ReactDOMServer from 'react-dom/server';
import AjoutBouclePage from '../components/AddLoopPage.js';
import { PreLoop } from '../interfaces/Loop.js';
import { handleNewLoop } from '../services/add_loop.js';
import { handleLoopProcessCodeForRouter } from '../services/handle_loops.js';
import { generateTimes, generateDelays, removePasswordsFromAccounts } from '../services/utils.js';
import { MAX_ACCOUNTS_PER_LOOP, MAX_TIMES_PER_LOOP, MAX_ANSWERS_PER_LOOP } from '../vars.js';
import LoopsPage from '../components/LoopsPage.js';

// Ce router contiendra les routes commençant par /boucles
const router = new Hono();

// Route pour afficher les boucles
router.get('/', async (c: Context): Promise<Response> => {
    try {
        const loops = await readLoops();
        // création de la table
        const stream = await ReactDOMServer.renderToReadableStream(<LoopsPage loops={loops} />);
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

// Route qui renvoie le formulaire et les données nécessaires pour ajouter une boucle
router.get('/ajout-boucle', async (c: Context): Promise<Response> => {
    try {
        const accounts = await readAccounts();
        const times = generateTimes(); // les horaires possibles que l'on peut associer à une boucle
        const delays = generateDelays(); // les délais possibles que l'on peut associer à une réponse

        // le nombre maximal d'entités que l'on peut ajouter à une boucle
        // = pour horaires et comptes, le minimum entre le nombre d'entités total et le maximum associable à une boucle
        // = pour réponses, le nombre maximum de réponses que peut inclure une boucle
        const maxCount = { 'account': Math.min(accounts.length, MAX_ACCOUNTS_PER_LOOP), 'time': Math.min(times.length, MAX_TIMES_PER_LOOP), 'answer': MAX_ANSWERS_PER_LOOP };
        const globalVars = { accounts: removePasswordsFromAccounts(accounts), times, delays, maxCount };

        const stream = await ReactDOMServer.renderToReadableStream(<AjoutBouclePage accounts={accounts} globalVars={globalVars} />);
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

// Route pour ajouter une boucle
router.post('/ajout-boucle', async (c: Context): Promise<Response> => {
    try {
        const data = await c.req.json() as PreLoop;
        const handleRes = await handleNewLoop(data);
        const { resultStr, statusCode } = handleLoopProcessCodeForRouter(handleRes);

        return c.json({ loop: handleRes.loop, infos: handleRes.infos, resultStr }, { status: statusCode });
    } catch (err: any) {
        console.error(err);

        return c.json({ resultStr: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

export default router;