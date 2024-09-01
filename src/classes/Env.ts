/**
 * Cette classe stocke la variable permettant l'accès à la base de données D1. La variable provient
 * de l'environnement Env de Cloudflare que l'on peut récupérer à chaque événement (requête ou cron trigger ici).
 * 
 * @class
 * @name D1
 * @kind class
 */
class D1 {
  private _db: D1Database | undefined;

  get db() {
    return this._db as D1Database;
  }

  /**
   * Fonction appelée à chaque événément pour enregistrer la variable donnant l'accès à D1.
   * 
   * @method
   * @name setDb
   * @kind method
   * @memberof D1
   * @param {D1Database} db
   * @returns {void}
   */
  setDb(db: D1Database): void {
    this._db = db;
  }
}

/**
 * Cette classe stocke la variable permettant l'accès à la base de données KV. La variable provient
 * de l'environnement Env de Cloudflare que l'on peut récupérer à chaque événement (requête ou cron trigger ici).
 * 
 * @class
 * @name KV
 * @kind class
 */
class KV {
  private _db: KVNamespace | undefined;

  get db() {
    return this._db as KVNamespace;
  }

  setKv(db: KVNamespace): void {
    this._db = db;
  }
}

export const d1 = new D1();
export const kv = new KV();