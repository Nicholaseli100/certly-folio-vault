import { type Certificate } from "@/lib/certificates-data";
import {
  type CertificadoLocal,
  extractCnpjFromSubject,
  localCertId,
} from "@/lib/tauri-certs";

export function localToCertificate(local: CertificadoLocal): Certificate {
  return {
    id: localCertId(local.thumbprint),
    razao_social: local.razao_social,
    cnpj_cpf: extractCnpjFromSubject(local.subject),
    data_cadastro: new Date().toISOString(),
    data_emissao: local.data_emissao,
    data_vencimento: local.data_vencimento,
    senha_pfx: "",
    nome_responsavel: "",
    email_contato: "",
    whatsapp_contato: "",
    notificar_email: true,
    notificar_whatsapp: false,
  };
}
