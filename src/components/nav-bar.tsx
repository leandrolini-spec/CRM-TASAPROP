"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Panel" },
  { href: "/contactos", label: "Contactos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/pagos", label: "Pagos" },
  { href: "/campanas", label: "Campañas" },
];

export default function NavBar({
  nombre,
  rol,
}: {
  nombre: string;
  rol: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-[#17184B] text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="font-bold text-lg">
              CRM <span className="text-[#D8E63C]">Tasaprop</span>
            </span>
            <nav className="hidden md:flex items-center gap-1">
              {LINKS.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-[#3CC8DD]"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/70 hidden sm:inline">
              {nombre} {rol ? `· ${rol}` : ""}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10 transition"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
