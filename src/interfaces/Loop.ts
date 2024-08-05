interface Answer {
    text: string;
    delay: string; // délai avant le post de la réponse
}

interface LastPost {
    topicURL: string;
    time: Date;
}

/**
 * Réduction de l'interface Account présente dans Loop.
 * 
 * @interface
 * @name MiniAccount
 * @kind interface
 */
interface MiniAccount {
    id: number;
    username: string;
    isBanned: boolean;
    unusable: boolean;
}

/**
 * Interface représentant une boucle.
 * 
 * @interface
 * @name Loop
 * @kind interface
 */
interface Loop {
    id: number;
    name: string;
    title: string;
    forumId: number;
    description: string;
    first_message: string;
    answers: Array<Answer>;
    times: Array<string>;
    accounts: Array<MiniAccount>;
    lastPost?: LastPost;
    status: string; // active, inactive (par utilisateur) ou disabled (par le serveur si tous les comptes bannis ou inutilisables)
}

export { Loop, MiniAccount };