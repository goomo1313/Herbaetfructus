// Verejná konfigurácia stránky Herba et Fructus.
// Supabase publishable/anon key a UUID používateľa nie sú heslá.
// NIKDY sem nevkladajte heslo správcu ani Supabase service_role/secret key.
window.HERBA_CONFIG = {
    supabaseUrl: "DOPLNTE_SUPABASE_PROJECT_URL",
    supabaseAnonKey: "DOPLNTE_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
    adminUserId: "DOPLNTE_UUID_SPRAVCU"
};
