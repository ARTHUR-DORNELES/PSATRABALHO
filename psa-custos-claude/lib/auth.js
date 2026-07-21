// Config de autenticação (server-side). A senha nunca vai pro bundle do cliente.
export const SITE_PASSWORD = process.env.SITE_PASSWORD || "PSA2030";
export const COOKIE_NAME = "psa_session";
// valor opaco gravado no cookie após login válido; middleware compara com isto
export const SESSION_VALUE = process.env.AUTH_TOKEN || "psa-ok-2030-7Kq9x2";
