/**
 * Objet représentant un log de serveur, affiché dans la page /logs.
 * 
 * @interface
 * @name ServerLog
 * @kind interface
 * @exports
 */
export default interface ServerLog {
    id: number;
    date: Date;
    message: string; // nom du code d'erreur
    type: 'erreur' | 'attention' | 'info';
    details: string;
    operation: string;
}