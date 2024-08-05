/**
 * Objet représentant un log de serveur, affiché dans la page /logs.
 * 
 * @interface
 * @name ServerLog
 * @kind interface
 * @exports
 */
export interface ServerLog {
    date?: Date;
    message: string;
    type: 'erreur' | 'attention' | 'info';
    details: string;
    operation: string;
}