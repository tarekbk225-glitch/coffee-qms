import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for use in Server Components, Server Actions
 * and Route Handlers. Reads/writes the auth session via Next.js cookies.
 *
 * NOTE: in a Server Component (not a Server Action / Route Handler) cookies
 * cannot be *set*, only read - the try/catch below swallows that expected
 * failure, relying on proxy.ts to refresh the session on every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component - safe to ignore because
            // proxy.ts refreshes the session on every navigation.
          }
        },
      },
    }
  );
}
