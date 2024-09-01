/**
 * Interface représentant une réponse associée à une boucle.
 * 
 * @interface
 * @name Answer
 * @kind interface
 * @exports
 */
export interface Answer {
    text: string; // contenu de la réponse
    delay: string; // délai avant le post de la réponse au format HH:MM
    totalDelay: string; // délai entre le post du topic et le post de la réponse au format HH:MM
}

/**
 * Interface représentant un post récent de la boucle
 * 
 * @interface
 * @name LastPost
 * @kind interface
 * @exports
 */
export interface LastPost {
    topicURL: string;
    time: string; // horaire HH:MM du topic
    date: Date; // date précise de post
    nextAnswersDate: Array<Date>; // tableau contenant les dates auxquelles les réponses seront postées
}

/**
 * Interface utilisée dans PreLoop.
 * 
 * @interface
 * @name PreAnswer
 * @kind interface
 * @exports
 */
export interface PreAnswer {
    text: string;
    delay: string; // format HH:MM
}

/**
 * Réduction de l'interface Account présente dans Loop.
 * 
 * @interface
 * @name MiniAccount
 * @kind interface
 */
export interface MiniAccount {
    id: number;
    username: string;
    isBanned: boolean;
    unusable: boolean;
    order: number; // ordre de priorité du compte dans le post de la boucle. Le premier compte est le compte de post par défaut.
}

/**
 * Interface représentant un compte associé à la boucle en tant que donnée du formulaire envoyé au backend.
 * 
 * @interface
 * @name PreAccount
 * @kind interface
 * @exports
 */
export interface PreAccount {
    id: number; // le front n'envoie que les ID des comptes
    order: number; // avec leur ordre de sélection
}

/**
 * Interface représentant les données envoyées depuis Pages à POST ajout-boucle ou PUT boucle/:id
 * 
 * @interface
 * @name PreLoop
 * @kind interface
 * @exports
 */
export interface PreLoop {
    id?: number; // ID, pas présent lorsqu'il s'agit d'un ajout de boucle
    name: string;
    title: string;
    forumId: number;
    description: string;
    first_message: string;
    answers: Array<PreAnswer>;
    times: Array<string>; // tableau des horaires de post au format HH:MM
    accounts: Array<PreAccount>;
    userStatus: 'inactive' | 'active'; // statut souhaité par l'utilisateur
}

/**
 * Interface représentant une boucle.
 * 
 * @interface
 * @name Loop
 * @kind interface
 */
export default interface Loop {
    id: number;
    name: string;
    title: string;
    forumId: number;
    description: string;
    first_message: string;
    answers: Array<Answer>;
    times: Array<string>; // tableau des horaires de post au format HH:MM
    accounts: Array<MiniAccount>;
    lastPosts: Array<LastPost>;
    userStatus: 'active' | 'inactive'; // donnée contrôlée par l'utilisateur depuis le checkbox des formulaires de boucle en front
    disabled: boolean // true si tous les comptes sont inutilisables (mauvais MDP, comptes inexistants, etc.)
}