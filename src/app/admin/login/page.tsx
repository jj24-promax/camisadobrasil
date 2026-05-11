"use client";

import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useState } from "react";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      setError("Preencha o e-mail e a senha.");
      return;
    }

    setPending(true);
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) {
        setError(signError.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-shell-bg flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-settings-surface w-full max-w-md p-8"
      >
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Alpha Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Aceda à gestão da sua loja</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-[13px] text-red-100/95"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="admin-login-email" className="admin-field-label">
              E-mail
            </label>
            <input
              id="admin-login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
              className="admin-control"
            />
          </div>

          <div>
            <label htmlFor="admin-login-password" className="admin-field-label">
              Senha
            </label>
            <input
              id="admin-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="admin-control"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-gold/30 bg-gold/15 text-[13px] font-semibold text-gold-bright shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors hover:bg-gold/22 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "A entrar…" : "Entrar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
