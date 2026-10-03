import { APP_NAME, APP_TAGLINE } from "@/config/site";
import { supabaseConfigured } from "@/lib/env";

export default function Home() {
  return (
    <section className="py-10 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        {APP_NAME}
      </h1>
      <p className="mt-3 text-lg text-primary font-semibold">{APP_TAGLINE}</p>
      <p className="mx-auto mt-4 max-w-md text-muted-foreground">
        Step 1 foundation is running. The feed arrives in step 4.
      </p>
      <p className="mt-6 inline-block rounded-full bg-primary-soft px-4 py-2 text-sm">
        Supabase: {supabaseConfigured() ? "configured ✅" : "not configured yet (see .env.example)"}
      </p>
    </section>
  );
}
