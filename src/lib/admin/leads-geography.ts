import type { Lead } from "@/types/admin";

export type LeadCityCount = {
  /** Nome para exibição */
  label: string;
  count: number;
};

export type LeadStateBucket = {
  uf: string;
  /** Sigla ou rótulo amigável (ex.: SP — São Paulo) */
  displayLabel: string;
  count: number;
  cities: LeadCityCount[];
};

export type LeadGeographySummary = {
  states: LeadStateBucket[];
  totalLeads: number;
  /** Leads sem UF válida (2 letras) */
  unknownStateCount: number;
};

/** Nomes por UF (apenas para legenda mais clara no painel). */
const UF_LABEL: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function normalizeUf(raw: string): string | null {
  const s = raw.replace(/\s/g, "").toUpperCase().slice(0, 5);
  if (s.length === 2 && /^[A-Z]{2}$/.test(s)) return s;
  return null;
}

/** Agrega leads por estado e por cidade dentro de cada estado. */
export function aggregateLeadGeography(leads: Lead[]): LeadGeographySummary {
  /** uf -> cidade key lower -> { label, count } */
  type CityAcc = Map<string, { label: string; count: number }>;
  const byState = new Map<string, { cities: CityAcc }>();
  let unknownStateCount = 0;

  for (const lead of leads) {
    const uf = normalizeUf(lead.state || "");
    const cityTrim = (lead.city || "").trim();
    const cityKey = cityTrim.length > 0 ? cityTrim.toLowerCase() : "__sem_cidade";

    if (!uf) {
      unknownStateCount += 1;
      continue;
    }

    let bucket = byState.get(uf);
    if (!bucket) {
      bucket = { cities: new Map() };
      byState.set(uf, bucket);
    }

    const cm = bucket.cities;
    const prev = cm.get(cityKey);
    if (prev) {
      prev.count += 1;
    } else {
      cm.set(cityKey, {
        label: cityTrim.length > 0 ? cityTrim : "Sem cidade",
        count: 1,
      });
    }
  }

  const states: LeadStateBucket[] = [];

  byState.forEach((bucket, uf) => {
    const citiesArr: LeadCityCount[] = [...bucket.cities.values()].sort((a, b) => b.count - a.count);
    const nome = UF_LABEL[uf];
    states.push({
      uf,
      displayLabel: nome ? `${uf} — ${nome}` : uf,
      count: citiesArr.reduce((acc, c) => acc + c.count, 0),
      cities: citiesArr,
    });
  });

  states.sort((a, b) => b.count - a.count);

  return {
    states,
    totalLeads: leads.length,
    unknownStateCount,
  };
}
