"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/leads")}`);
        return;
      }
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-zinc-600">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}

