import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
   const tables = await sql`
      select tablename, rowsecurity
      from pg_catalog.pg_tables
      where schemaname = 'public'
   `;
   const grants = await sql`
      select grantee, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
   `;
   const publicDefiners = await sql`
      select p.oid::int as oid, n.nspname as schema, p.proname as name
      from pg_proc p
      inner join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and (has_function_privilege('anon', p.oid, 'EXECUTE')
          or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
   `;
   const insecure = tables.filter((table) => !table.rowsecurity);
   if (insecure.length || grants.length || publicDefiners.length) {
      throw new Error(
         `Database security check failed: ${insecure.length} tables without RLS, ${grants.length} public grants, and ${publicDefiners.length} executable public security-definer functions.`,
      );
   }
   console.log(
      `Database security check passed for ${tables.length} public tables.`,
   );
} finally {
   await sql.end();
}
