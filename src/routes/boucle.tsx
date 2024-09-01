import { Hono, Context } from "hono";
import ReactDOMServer from "react-dom/server";
import LoopPage from "../components/LoopPage.js";
import { readLoops, readAccounts } from "../database.js";
import Loop, { PreLoop } from "../interfaces/Loop.js";
import { generateTimes, generateDelays, removePasswordsFromAccounts } from "../services/utils.js";
import { MAX_ACCOUNTS_PER_LOOP, MAX_TIMES_PER_LOOP, MAX_ANSWERS_PER_LOOP, DELETION_FAIL } from "../vars.js";
import { handleLoopDeletion } from "../services/remove_loop.js";
import { handleLoopProcessCodeForRouter } from "../services/handle_loops.js";
import { handleLoopUpdate } from "../services/update_loops.js";

// Ce routeur contiendra les routes commençant par /boucle
const router = new Hono();

// Route pour afficher les informations d'une boucle
router.get('/:id', async (c: Context): Promise<Response> => {
    try {
        const loopId = parseInt(c.req.param('id').toString());
        const loops = await readLoops((l: Loop) => l.id === loopId);
        if (loops.length > 0) {
            const loop = loops[0];
            const accounts = await readAccounts();
            const times = generateTimes();
            const delays = generateDelays();

            // le nombre maximal d'entités que l'on peut ajouter à une boucle
            // = pour horaires et comptes, le minimum entre le nombre d'entités total et le maximum associable à une boucle
            // = pour réponses, le nombre maximum de réponses que peut inclure une boucle
            const maxCount = { 'account': Math.min(accounts.length, MAX_ACCOUNTS_PER_LOOP), 'time': Math.min(times.length, MAX_TIMES_PER_LOOP), 'answer': MAX_ANSWERS_PER_LOOP };
            const globalVars = { accounts: removePasswordsFromAccounts(accounts), loop, times, delays, maxCount };

            const stream = await ReactDOMServer.renderToReadableStream(<LoopPage loop={loop} accounts={accounts} globalVars={globalVars} />);

            return new Response(stream, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                },
            });
        }

        const url = new URL(c.req.url);
        return c.redirect(`${url.origin}/boucles`, 301);
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

// Route pour modifier une boucle
router.put('/:id', async (c: Context): Promise<Response> => {
    try {
        const data = await c.req.json() as PreLoop;
        const target = await readLoops((l: Loop) => l.id === parseInt(c.req.param('id')));
        if (!target || target.length === 0) {
            return c.json({ resultsStr: `La boucle d'ID ${c.req.param('id')} n'existe pas.` }, { status: 404 });
        }
        const handleRes = await handleLoopUpdate(data);
        const { resultStr, statusCode } = handleLoopProcessCodeForRouter(handleRes);
        return c.json({ loop: handleRes.loop, infos: handleRes.infos, resultStr: resultStr }, { status: statusCode });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});


// Route pour supprimer une boucle
router.delete('/:id', async (c: Context): Promise<Response> => {
    try {
        const { code, name } = await handleLoopDeletion(parseInt(c.req.param('id')));
        if (code === DELETION_FAIL) {
            return c.json({ resultStr: 'Échec de la requête : erreur inconnue (probablement avec le format JSON).' }, { status: 500 });
        }
        return c.json({ resultStr: `Succès de la requête : la boucle ${name} a été retirée.` }, { status: 200 });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

export default router;