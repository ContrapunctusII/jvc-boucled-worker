declare global {
	interface Env {
		DB: D1Database;
		KV: KVNamespace;
	}
}

export { }