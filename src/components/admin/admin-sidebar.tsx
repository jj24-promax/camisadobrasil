"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  LogOut,
  Users,
  UserRound,
  Settings,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type AdminSidebarProps = {
  mobileOpen: boolean;
  onNavigate: () => void;
};

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Users, exact: false },
  { href: "/admin/cobrar-pix", label: "Cobrar Pix", icon: QrCode, exact: false },
  { href: "/admin/clientes", label: "Clientes", icon: UserRound, exact: false },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false },
] as const;

export function AdminSidebar({ mobileOpen, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-dvh w-[17rem] flex-col border-r border-white/[0.08] bg-[#050a14]/95 transition-transform duration-300 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-[3.75rem] items-center border-b border-white/[0.07] px-5">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-gold-bright">
          Alpha Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "bg-gold/10 text-gold-bright shadow-[inset_0_0_0_1px_rgba(212,175,55,0.2)]" : "text-muted-foreground hover:bg-white/[0.04]"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.07] p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-white/[0.04] transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}