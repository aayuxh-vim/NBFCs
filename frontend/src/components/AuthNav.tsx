"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push(`/login?next=${encodeURIComponent(pathname || "/leads")}`);
  }

  if (!email) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname || "/leads")}`}
        className="text-sm text-zinc-600 hover:text-zinc-950"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-zinc-600">
      <span className="hidden sm:inline">{email}</span>
      <button
        onClick={signOut}
        className="rounded-md border px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        Sign out
      </button>
    </div>
  );
}

