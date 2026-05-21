import { type Certificate } from "@/lib/certificates-data";

export const NEW_CERTIFICATE_ID = "__new__";

export function isNewCertificate(cert: Certificate): boolean {
  return cert.id === NEW_CERTIFICATE_ID;
}

export function createEmptyCertificate(): Certificate {
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 365);

  return {
    id: NEW_CERTIFICATE_ID,
    razao_social: "",
    cnpj_cpf: "",
    data_cadastro: new Date().toISOString(),
    data_emissao: new Date().toISOString().slice(0, 10),
    data_vencimento: vencimento.toISOString().slice(0, 10),
    senha_pfx: "",
    nome_responsavel: "",
    email_contato: "",
    whatsapp_contato: "",
    notificar_email: true,
    notificar_whatsapp: false,
  };
}
