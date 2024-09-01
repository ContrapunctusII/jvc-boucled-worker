/**
 * Interface représentant une réduction de l'interface Loop qui est présente dans l'interface Account.
 * 
 * @interface
 * @name MiniLoop
 * @kind interface
 */
export interface MiniLoop {
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
export default interface Account {
    id: number;
    username: string;
    password: string;
    level: number; // 0 si banni
    isBanned: boolean;
    loops: MiniLoop[];
    unusable: boolean; // inutilisable si compte inexistant ou mot de passe incorrect
}