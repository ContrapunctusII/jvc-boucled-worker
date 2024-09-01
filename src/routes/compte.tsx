import { Context, Hono } from "hono";
import { handleAccountDeletion } from "../services/remove_account.js";
import { DELETION_FAIL } from "../vars.js";

// Ce router contiendra les routes commençant par /compte
const router = new Hono();

// Route pour supprimer un compte
router.delete('/:id', async (c: Context): Promise<Response> => {
    try {
        const { code, username } = await handleAccountDeletion(parseInt(c.req.param('id').toString()));
        if (code === DELETION_FAIL) {
            return c.json({ resultStr: 'Échec de la requête : erreur inconnue (probablement avec la base de données D1).' }, { status: 500 });
        }
        return c.json({ resultStr: `Succès de la requête : le compte ${username} a été retiré.` }, { status: 200 });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: `Erreur inconnue : ${err.message}` }, { status: 500 });
    }
});

export default router;