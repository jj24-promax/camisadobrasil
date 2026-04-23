"use client";

import { useActionState, useEffect } from "react";
import { Building2, LayoutDashboard, Plug, UserCircle, LogOut, ExternalLink, Save, Loader2 } from "lucide-react";
import {
  AdminSettingsSection,
  AdminSettingsFieldLabel,
  adminSettingsInputClass,
} from "@/components/admin/admin-settings-section";
import { formatDateTime } from "@/lib/admin-format";
import {
  mockStoreProfile,
  mockPanelPreferences,
  mockIntegrationsPreview,
  mockAdminProfile,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import { updateStoreSettings } from "@/app/admin/(dashboard)/configuracoes/actions";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

function IntegrationStatusPill({ status }: { status: "connected" | "disconnected" | "planned" }) {
  const map = {
    connected: {
      label: "Conectado",
      className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    },
    disconnected: {
      label: "Não conectado",
      className: "border-white/15 bg-white/[0.06] text-muted-foreground",
    },
    planned: {
      label: "Planejado",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    },
  } as const;
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide leading-none",
        s.className
      )}
    >
      {s.label}
    </span>
  );
}

function VisualToggle({ on, label, description }: { on: boolean; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:px-5">
      <div className="min-w-0 pr-2">
        <p className="text-[13px] font-medium text-foreground sm:text-sm">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div
        className={cn(
          "relative h-8 w-[3.25rem] shrink-0 rounded-full border border-white/[0.1] transition-colors",
          on ? "bg-emerald-500/[0.22]" : "bg-white/[0.05]"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-all duration-200",
            on ? "right-1" : "left-1"
          )}
        />
      </div>
    </div>
  );
}

type AdminSettingsViewProps = {
  supabaseEnvConfigured?: boolean;
  initialSettings: {
    tracking_link: string;
    whatsapp: string;
    contact_email: string;
  };
};

function buildIntegrationsList(supabaseEnvConfigured: boolean) {
  return mockIntegrationsPreview.map((item) => {
    if (item.id === "supabase" && supabaseEnvConfigured) {
      return {
        ...item,
        status: "connected" as const,
        detail:
          "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY definidos no servidor. O painel já usa este projeto — chaves não são exibidas aqui.",
      };
    }
    return { ...item };
  });
}

export function AdminSettingsView({ supabaseEnvConfigured = false, initialSettings }: AdminSettingsViewProps) {
  const integrationItems = buildIntegrationsList(supabaseEnvConfigured);
  const initials = mockAdminProfile.displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [state, formAction, pending] = useActionState(updateStoreSettings, {
    success: false,
    error: "",
  });

  useEffect(() => {
    if (state?.success && state?.message) {
      toast.success(state.message);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-2 sm:space-y-7">
      <AdminSettingsSection
        icon={Building2}
        title="Informações da loja"
        description="Atualize aqui os links de rastreamento e dados de contato. As mudanças refletem de imediato para todos os novos clientes."
      >
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AdminSettingsFieldLabel htmlFor="cfg-store-name">Nome da loja</AdminSettingsFieldLabel>
            <input
              id="cfg-store-name"
              readOnly
              defaultValue={mockStoreProfile.name}
              className={adminSettingsInputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <AdminSettingsFieldLabel htmlFor="cfg-store-url">URL pública</AdminSettingsFieldLabel>
            <div className="relative">
              <input
                id="cfg-store-url"
                readOnly
                defaultValue={mockStoreProfile.publicUrl}
                className={cn(adminSettingsInputClass, "pr-10")}
              />
              <ExternalLink
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60"
                aria-hidden
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <AdminSettingsFieldLabel htmlFor="cfg-tracking-link">Link de Rastreamento (Pós-compra)</AdminSettingsFieldLabel>
            <input
              id="cfg-tracking-link"
              name="tracking_link"
              type="url"
              defaultValue={initialSettings.tracking_link}
              className={cn(adminSettingsInputClass, "placeholder:text-muted-foreground/50 border-white/20 focus:border-gold/50")}
              placeholder="https://..."
              required
            />
            <p className="mt-1.5 text-xs text-muted-foreground">URL para a qual o cliente é direcionado na página de obrigado ao clicar em &quot;Acompanhar pedido&quot;.</p>
          </div>
          <div>
            <AdminSettingsFieldLabel htmlFor="cfg-store-email">E-mail de contato</AdminSettingsFieldLabel>
            <input
              id="cfg-store-email"
              name="contact_email"
              type="email"
              defaultValue={initialSettings.contact_email}
              className={cn(adminSettingsInputClass, "border-white/20 focus:border-gold/50")}
            />
          </div>
          <div>
            <AdminSettingsFieldLabel htmlFor="cfg-store-wa">WhatsApp</AdminSettingsFieldLabel>
            <input
              id="cfg-store-wa"
              name="whatsapp"
              type="text"
              defaultValue={initialSettings.whatsapp}
              className={cn(adminSettingsInputClass, "border-white/20 focus:border-gold/50")}
            />
          </div>
          <div>
            <AdminSettingsFieldLabel htmlFor="cfg-tz">Fuso horário</AdminSettingsFieldLabel>
            <input id="cfg-tz" readOnly defaultValue={mockStoreProfile.timezone} className={adminSettingsInputClass} />
          </div>
          <div>
            <AdminSettingsFieldLabel htmlFor="cfg-currency">Moeda</AdminSettingsFieldLabel>
            <input
              id="cfg-currency"
              readOnly
              defaultValue={mockStoreProfile.currencyLabel}
              className={adminSettingsInputClass}
            />
          </div>
          <div className="sm:col-span-2 mt-4 flex justify-end border-t border-white/10 pt-6">
            <Button type="submit" disabled={pending} className="bg-gold text-navy-deep hover:bg-gold-bright transition-colors font-bold uppercase tracking-wider">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </AdminSettingsSection>

      <AdminSettingsSection
        icon={LayoutDashboard}
        title="Preferências do painel"
        description="Como a interface administrativa se comporta para a sua equipe. Os controles abaixo são apenas ilustrativos."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <AdminSettingsFieldLabel htmlFor="cfg-density">Densidade das tabelas</AdminSettingsFieldLabel>
            <select
              id="cfg-density"
              disabled
              defaultValue={mockPanelPreferences.tableDensity}
              className={cn(
                adminSettingsInputClass,
                "cursor-not-allowed opacity-80",
                "appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-9"
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              <option value="compacta">Compacta</option>
              <option value="confortável">Confortável</option>
              <option value="ampla">Ampla</option>
            </select>
          </div>
          <div>
            <AdminSettingsFieldLabel htmlFor="cfg-lang">Idioma</AdminSettingsFieldLabel>
            <input
              id="cfg-lang"
              readOnly
              defaultValue={mockPanelPreferences.language}
              className={adminSettingsInputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <AdminSettingsFieldLabel htmlFor="cfg-theme">Tema</AdminSettingsFieldLabel>
            <input
              id="cfg-theme"
              readOnly
              defaultValue={mockPanelPreferences.theme}
              className={adminSettingsInputClass}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              O painel utiliza o tema escuro premium por padrão, alinhado à identidade da loja.
            </p>
          </div>
        </div>
        <div className="space-y-3 pt-1">
          <VisualToggle
            on={mockPanelPreferences.emailAlertsNewOrders}
            label="Alertas de novos pedidos"
            description="Resumo diário na caixa de entrada configurada."
          />
          <VisualToggle
            on={mockPanelPreferences.emailAlertsNewLeads}
            label="Alertas de novos leads"
            description="Notificação quando um contato entra no funil."
          />
        </div>
      </AdminSettingsSection>

      <AdminSettingsSection
        icon={Plug}
        title="Integrações futuras"
        description={
          supabaseEnvConfigured
            ? "Conectores externos. Credenciais do Supabase ficam só em variáveis de ambiente no servidor — esta página não as mostra nem as grava."
            : "Conectores e serviços externos. Defina as variáveis do Supabase no servidor para o painel carregar dados reais."
        }
      >
        <ul className="space-y-3 sm:space-y-3.5">
          {integrationItems.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-[15px] font-semibold text-foreground">{item.name}</p>
                  <IntegrationStatusPill status={item.status} />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">{item.description}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground/85">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </AdminSettingsSection>

      <AdminSettingsSection
        icon={UserCircle}
        title="Usuário administrador"
        description="Sessão e identidade no painel. A autenticação real será tratada com Supabase Auth ou provedor equivalente."
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 font-display text-lg font-bold text-gold-bright ring-1 ring-gold/25"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-base font-semibold text-white">{mockAdminProfile.displayName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{mockAdminProfile.email}</p>
              <p className="mt-2 inline-flex rounded-lg border border-gold/25 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-bright">
                {mockAdminProfile.role}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Último acesso:{" "}
              <span className="text-foreground/90">{formatDateTime(mockAdminProfile.lastAccessAt)}</span>
            </p>
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-muted-foreground opacity-55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
              <LogOut className="size-4" aria-hidden />
              Sair da conta
            </button>
            <p className="text-xs text-muted-foreground">O botão de sair será habilitado após o login real.</p>
          </div>
        </div>
      </AdminSettingsSection>
    </div>
  );
}