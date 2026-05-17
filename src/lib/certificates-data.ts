export type Certificate = {
  id: string;
  razao_social: string;
  cnpj_cpf: string;
  data_cadastro: string; // ISO timestamp
  data_emissao: string; // ISO date
  data_vencimento: string; // ISO date
  senha_pfx: string;
  nome_responsavel: string;
  email_contato: string;
  whatsapp_contato: string;
  notificar_email: boolean;
  notificar_whatsapp: boolean;
};

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const hoursAgo = (h: number) => {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
};

export const seedCertificates: Certificate[] = [
  {
    id: "c1",
    razao_social: "Aurora Tecnologia LTDA",
    cnpj_cpf: "12.345.678/0001-90",
    data_cadastro: hoursAgo(2),
    data_emissao: daysFromNow(-300),
    data_vencimento: daysFromNow(65),
    senha_pfx: "Aurora@2025",
    nome_responsavel: "Helena Martins",
    email_contato: "helena@auroratec.com.br",
    whatsapp_contato: "+55 11 98765-4321",
    notificar_email: true,
    notificar_whatsapp: true,
  },
  {
    id: "c2",
    razao_social: "Pereira & Costa Advogados",
    cnpj_cpf: "98.765.432/0001-10",
    data_cadastro: hoursAgo(12),
    data_emissao: daysFromNow(-350),
    data_vencimento: daysFromNow(12),
    senha_pfx: "PCadv#1923",
    nome_responsavel: "Rafael Costa",
    email_contato: "rafael@pcadvogados.com.br",
    whatsapp_contato: "+55 21 99876-1122",
    notificar_email: true,
    notificar_whatsapp: false,
  },
  {
    id: "c3",
    razao_social: "Mercado Vila Nova ME",
    cnpj_cpf: "45.222.111/0001-77",
    data_cadastro: hoursAgo(36),
    data_emissao: daysFromNow(-365),
    data_vencimento: daysFromNow(-4),
    senha_pfx: "VilaNova2024",
    nome_responsavel: "Carla Souza",
    email_contato: "financeiro@vilanova.com.br",
    whatsapp_contato: "+55 11 95544-3322",
    notificar_email: true,
    notificar_whatsapp: true,
  },
  {
    id: "c4",
    razao_social: "Construtora Horizonte S/A",
    cnpj_cpf: "33.444.555/0001-22",
    data_cadastro: hoursAgo(72),
    data_emissao: daysFromNow(-200),
    data_vencimento: daysFromNow(165),
    senha_pfx: "Horiz0nte!",
    nome_responsavel: "Bruno Almeida",
    email_contato: "bruno@horizonte.eng.br",
    whatsapp_contato: "+55 31 98123-4567",
    notificar_email: false,
    notificar_whatsapp: true,
  },
  {
    id: "c5",
    razao_social: "Studio Lume Arquitetura",
    cnpj_cpf: "22.111.000/0001-44",
    data_cadastro: hoursAgo(120),
    data_emissao: daysFromNow(-340),
    data_vencimento: daysFromNow(28),
    senha_pfx: "Lume@arq",
    nome_responsavel: "Marina Lopes",
    email_contato: "marina@studiolume.com",
    whatsapp_contato: "+55 11 97777-8888",
    notificar_email: true,
    notificar_whatsapp: true,
  },
  {
    id: "c6",
    razao_social: "Padaria Bom Pão LTDA",
    cnpj_cpf: "11.222.333/0001-55",
    data_cadastro: hoursAgo(200),
    data_emissao: daysFromNow(-360),
    data_vencimento: daysFromNow(-32),
    senha_pfx: "BomPao#2024",
    nome_responsavel: "José Henrique",
    email_contato: "jose@bompao.com.br",
    whatsapp_contato: "+55 11 93333-2211",
    notificar_email: false,
    notificar_whatsapp: false,
  },
  {
    id: "c7",
    razao_social: "Clínica Vitalis",
    cnpj_cpf: "55.666.777/0001-88",
    data_cadastro: hoursAgo(300),
    data_emissao: daysFromNow(-150),
    data_vencimento: daysFromNow(215),
    senha_pfx: "Vitalis2026",
    nome_responsavel: "Dra. Patrícia Reis",
    email_contato: "contato@vitalis.med.br",
    whatsapp_contato: "+55 41 99222-1100",
    notificar_email: true,
    notificar_whatsapp: false,
  },
  {
    id: "c8",
    razao_social: "Transportadora Rota Sul",
    cnpj_cpf: "77.888.999/0001-11",
    data_cadastro: hoursAgo(500),
    data_emissao: daysFromNow(-355),
    data_vencimento: daysFromNow(7),
    senha_pfx: "RotaSul!88",
    nome_responsavel: "Eduardo Lima",
    email_contato: "eduardo@rotasul.com.br",
    whatsapp_contato: "+55 48 98765-1234",
    notificar_email: true,
    notificar_whatsapp: true,
  },
];

export type CertStatus = "regular" | "warning" | "expired";

export function getStatus(vencimento: string): { kind: CertStatus; daysLeft: number; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento);
  const diff = Math.ceil((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { kind: "expired", daysLeft: diff, label: `Vencido há ${Math.abs(diff)}d` };
  if (diff <= 30) return { kind: "warning", daysLeft: diff, label: `Vence em ${diff}d` };
  return { kind: "regular", daysLeft: diff, label: "Regular" };
}

export function formatDateBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}
