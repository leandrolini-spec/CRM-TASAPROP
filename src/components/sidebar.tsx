"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Handshake,
  Wallet,
  DollarSign,
  Receipt,
  Megaphone,
  Calendar,
  Building2,
  Code2,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  LogOut,
} from "lucide-react";
import MailBell from "@/components/mail-bell";
import { createClient } from "@/lib/supabase/client";
import { cerrarSesion } from "@/lib/auth";

type Profile = {
  id: string;
  nombre: string;
  email: string;
  rol: string | null;
  telefono: string | null;
  email_trabajo: string | null;
  avatar_url: string | null;
};

type NavLink = { label: string; href: string; icon: typeof Users };
type NavEntry =
  | { type: "link"; label: string; href: string; icon: typeof Users }
  | { type: "group"; label: string; href?: string; icon: typeof Users; items: NavLink[] };

const NAV: NavEntry[] = [
  { type: "link", label: "Panel", href: "/", icon: LayoutDashboard },
  {
    type: "group",
    label: "Contactos",
    href: "/contactos",
    icon: Users,
    items: [
      { label: "Seguimiento", href: "/seguimiento", icon: ListChecks },
      { label: "Pruebas / Alianzas", href: "/clientes", icon: Handshake },
    ],
  },
  {
    type: "group",
    label: "Finanzas",
    icon: Wallet,
    items: [
      { label: "Ingresos MP", href: "/pagos", icon: DollarSign },
      { label: "Gastos", href: "/gastos", icon: Receipt },
    ],
  },
  { type: "link", label: "Campañas", href: "/campanas", icon: Megaphone },
  { type: "link", label: "Calendario", href: "/calendario", icon: Calendar },
  { type: "link", label: "Datos de la Empresa", href: "/empresa", icon: Building2 },
  { type: "link", label: "Desarrollo", href: "/desarrollo", icon: Code2 },
];

const COLAPSADO_KEY = "tasaprop:sidebar-colapsado";

function groupIsActive(entry: NavEntry, pathname: string) {
  if (entry.type === "link") return pathname === entry.href;
  const headerActive = entry.href === pathname;
  const childActive = entry.items.some((i) => pathname.startsWith(i.href));
  return headerActive || childActive;
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  function grupoActivo(pathname: string) {
    const activo = NAV.find((entry) => entry.type === "group" && groupIsActive(entry, pathname));
    return activo ? activo.label : null;
  }

  const [mobileAbierto, setMobileAbierto] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  // Solo un grupo puede quedar desplegado a la vez.
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(() => grupoActivo(pathname));
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);

  useEffect(() => {
    const guardado = localStorage.getItem(COLAPSADO_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee la preferencia guardada recién al montar en el cliente (localStorage no existe en el servidor)
    if (guardado === "1") setColapsado(true);
  }, []);

  function toggleColapsado() {
    setColapsado((prev) => {
      const next = !prev;
      localStorage.setItem(COLAPSADO_KEY, next ? "1" : "0");
      if (next) setGrupoAbierto(null);
      return next;
    });
  }

  // Al navegar a una ruta que no pertenece al grupo abierto (otra sección,
  // o el otro grupo), lo cerramos solo. Si la nueva ruta sí pertenece a un
  // grupo, ese pasa a ser el abierto.
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setGrupoAbierto(grupoActivo(pathname));
  }

  function toggleGrupo(label: string) {
    setGrupoAbierto((prev) => (prev === label ? null : label));
  }

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-1 focus-visible:ring-offset-brand-navy";

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${focusRing} ${
      active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  function contenidoNav(colapsadoUi: boolean) {
    return (
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-1">
        {NAV.map((entry) => {
          if (entry.type === "link") {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                prefetch={false}
                title={colapsadoUi ? entry.label : undefined}
                onClick={() => {
                  setMobileAbierto(false);
                  setGrupoAbierto(null);
                }}
                className={`${linkClass(pathname === entry.href)} ${
                  colapsadoUi ? "justify-center px-0" : ""
                }`}
              >
                <Icon size={18} className="shrink-0 text-brand-lime" />
                {!colapsadoUi && <span className="truncate">{entry.label}</span>}
              </Link>
            );
          }

          const HeaderIcon = entry.icon;
          const abierto = grupoAbierto === entry.label;
          const activo = groupIsActive(entry, pathname);
          const headerActivo = activo && !entry.items.some((i) => pathname.startsWith(i.href));

          if (colapsadoUi) {
            return (
              <div key={entry.label} className="space-y-1">
                {entry.href && (
                  <Link
                    href={entry.href}
                    prefetch={false}
                    title={entry.label}
                    onClick={() => setMobileAbierto(false)}
                    className={`${linkClass(headerActivo)} justify-center px-0`}
                  >
                    <HeaderIcon size={18} className="shrink-0 text-brand-lime" />
                  </Link>
                )}
                {entry.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      title={item.label}
                      onClick={() => setMobileAbierto(false)}
                      className={`${linkClass(pathname.startsWith(item.href))} justify-center px-0`}
                    >
                      <ItemIcon size={18} className="shrink-0 text-brand-lime" />
                    </Link>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={entry.label}>
              <div
                className={`flex items-center rounded-lg text-sm font-medium transition ${
                  headerActivo ? "bg-white/15 text-white" : "text-white/80"
                }`}
              >
                {entry.href ? (
                  <Link
                    href={entry.href}
                    prefetch={false}
                    onClick={() => {
                      setMobileAbierto(false);
                      setGrupoAbierto(entry.label);
                    }}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${focusRing} hover:bg-white/10 hover:text-white`}
                  >
                    <HeaderIcon size={18} className="shrink-0 text-brand-lime" />
                    <span className="truncate">{entry.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setGrupoAbierto(entry.label)}
                    className={`flex-1 flex items-center gap-2.5 text-left px-3 py-2 rounded-lg transition ${focusRing} hover:bg-white/10 hover:text-white`}
                  >
                    <HeaderIcon size={18} className="shrink-0 text-brand-lime" />
                    <span className="truncate">{entry.label}</span>
                  </button>
                )}
                <button
                  onClick={() => toggleGrupo(entry.label)}
                  className={`px-2 py-2 rounded-lg transition ${focusRing} text-white/60 hover:text-white`}
                  aria-label={`Desplegar ${entry.label}`}
                >
                  <ChevronRight
                    size={16}
                    className="transition-transform"
                    style={{ transform: abierto ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                </button>
              </div>
              {abierto && (
                <div className="ml-3 mt-1 space-y-1 border-l border-white/15 pl-3">
                  {entry.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setMobileAbierto(false)}
                        className={linkClass(pathname.startsWith(item.href))}
                      >
                        <ItemIcon size={16} className="shrink-0 text-brand-lime" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  function contenidoPerfil(colapsadoUi: boolean) {
    return (
      <div
        className={`border-t border-white/10 p-3 flex gap-1.5 ${
          colapsadoUi ? "flex-col items-center" : "items-center"
        }`}
      >
        <Link
          href="/perfil"
          prefetch={false}
          title={colapsadoUi ? profile.nombre : undefined}
          onClick={() => {
            setMobileAbierto(false);
            setGrupoAbierto(null);
          }}
          className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition min-w-0 ${focusRing} ${
            colapsadoUi ? "justify-center px-0" : "flex-1"
          } ${pathname === "/perfil" ? "bg-white/15" : "hover:bg-white/10"}`}
        >
          <span
            className={`relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden ${
              profile.avatar_url ? "bg-white" : "bg-brand-lime text-brand-navy"
            }`}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.nombre}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              profile.nombre.slice(0, 1).toUpperCase()
            )}
          </span>
          {!colapsadoUi && (
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white truncate">
                {profile.nombre}
              </span>
              <span className="block text-xs text-white/60 truncate">
                {profile.rol ?? "equipo"}
              </span>
            </span>
          )}
        </Link>
        <button
          onClick={() => cerrarSesion(supabase, router)}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition ${focusRing}`}
        >
          <LogOut size={17} />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Botón hamburguesa (solo mobile) */}
      <button
        onClick={() => setMobileAbierto(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center text-brand-navy"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar desktop */}
      <aside
        className={`hidden md:flex md:flex-col shrink-0 bg-brand-navy sticky top-0 h-screen transition-[width] duration-200 ${
          colapsado ? "w-[72px]" : "w-64"
        }`}
      >
        <div
          className={`pt-5 pb-4 flex items-center gap-2 ${
            colapsado ? "px-0 justify-center flex-col" : "px-4 justify-between"
          }`}
        >
          {colapsado ? (
            <Image
              src="/logo-tasaprop-icon-white.png"
              alt="Tasaprop"
              width={285}
              height={373}
              className="h-7 w-auto"
              priority
            />
          ) : (
            <>
              <Image
                src="/logo-tasaprop-white.png"
                alt="Tasaprop"
                width={1954}
                height={403}
                className="h-6 w-auto"
                priority
              />
              <MailBell variant="dark" />
            </>
          )}
        </div>

        {contenidoNav(colapsado)}
        {contenidoPerfil(colapsado)}

        <button
          onClick={toggleColapsado}
          className={`flex items-center justify-center gap-2 border-t border-white/10 py-3.5 text-sm font-medium text-brand-lime bg-white/[0.06] hover:bg-white/15 transition ${focusRing}`}
          aria-label={colapsado ? "Desplegar menú" : "Plegar menú"}
          title={colapsado ? "Desplegar menú" : "Plegar menú"}
        >
          {colapsado ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          {!colapsado && <span>Plegar menú</span>}
        </button>
      </aside>

      {/* Sidebar mobile (overlay) — siempre desplegado, no aplica plegado */}
      {mobileAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileAbierto(false)}
          />
          <aside className="relative w-64 bg-brand-navy h-full shadow-xl flex flex-col">
            <div className="px-4 pt-5 pb-4 flex items-center justify-between gap-2">
              <Image
                src="/logo-tasaprop-white.png"
                alt="Tasaprop"
                width={1954}
                height={403}
                className="h-6 w-auto"
                priority
              />
              <MailBell variant="dark" />
            </div>
            {contenidoNav(false)}
            {contenidoPerfil(false)}
          </aside>
        </div>
      )}
    </>
  );
}
