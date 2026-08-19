"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#17184B] px-4">
      <div className="w-full max-w-sm bg-[#FCFCFC] rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-[#17184B] mb-1">
          CRM Tasaprop
        </h1>
        <p className="text-sm text-[#72767B] mb-6">
          Ingresá con tu usuario del equipo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#202124] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3CC8DD]"
              placeholder="tu@tasaprop.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#202124] mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3CC8DD]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#17184B] text-white py-2.5 font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-xs text-[#72767B] mt-6">
          ¿No tenés cuenta todavía? Pedile a un admin que te cree el usuario
          desde el panel de Supabase (Authentication → Users).
        </p>
      </div>
    </div>
  );
}
