/**
 * Interface représentant une réduction de l'interface Loop qui est présente dans les interface Account.
 * 
 * @interface
 * @name MiniLoop
 * @kind interface
 */
interface MiniLoop {
    id: number;
    name: string;
}

/**
 * Interface représentant un compte.
 * 
 * @interface
 * @name Account
 * @kind interface
 */
interface Account {
    id: number;
    username: string;
    password: string;
    level: number; // null si banni
    isBanned: boolean;
    loops?: Array<MiniLoop>;
    unusable: boolean; // inutilisable si inexistent ou mot de passe incorrect
}

export { MiniLoop, Account };