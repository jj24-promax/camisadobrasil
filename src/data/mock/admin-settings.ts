/**
 * Dados fictícios da tela de configurações — substituir por fetch Supabase / formulários persistidos.
 */

export const mockStoreProfile = {
  name: "Alpha Brasil",
  publicUrl: "https://www.alphabr.store",
  contactEmail: "contato@alphabrasil.com.br",
  whatsapp: "(11) 99999-0000",
  timezone: "America/Sao_Paulo",
  currencyLabel: "Real brasileiro (BRL)",
};

export const mockPanelPreferences = {
  tableDensity: "confortável" as const,
  language: "Português (Brasil)",
  theme: "Escuro",
  emailAlertsNewOrders: true,
  emailAlertsNewLeads: true,
};

export const mockIntegrationsPreview = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Banco de dados, auth e APIs do painel.",
    status: "disconnected" as const,
    detail: "Configure em variáveis de ambiente.",
  },
  {
    id: "pix",
    name: "Gateway PIX",
    description: "Pagamentos instantâneos na loja.",
    status: "connected" as const,
    detail: "Ambiente de demonstração ativo.",
  },
  {
    id: "email",
    name: "E-mail transacional",
    description: "Confirmações de pedido e recuperação.",
    status: "planned" as const,
    detail: "Integração prevista na próxima fase.",
  },
] as const;

export const mockAdminProfile = {
  displayName: "Gabriel Alves",
  email: "gabriel@alphabrasil.com.br",
  role: "Administrador",
  lastAccessAt: "2026-04-10T14:32:00",
};
