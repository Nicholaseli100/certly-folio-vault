import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-crypto";

export type CertificadoLocal = {
  thumbprint: string;
  subject: string;
  razao_social: string;
  cnpj_cpf: string;
  email_contato: string;
  data_emissao: string;
  data_vencimento: string;
};

export async function sincronizarCertificadosLocais(): Promise<CertificadoLocal[]> {
  if (!isTauriRuntime()) {
    throw new Error(
      "A sincronização com o Windows só está disponível no app desktop (Tauri).",
    );
  }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout ao ler certificados do Windows.")), 5000)
  );

  return Promise.race([
    invoke<CertificadoLocal[]>("sincronizar_certificados_locais"),
    timeout,
  ]);
}

const CNPJ_IN_SUBJECT = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14}/;

export function extractCnpjFromSubject(subject: string): string {
  const match = subject.match(CNPJ_IN_SUBJECT);
  return match?.[0] ?? "";
}

export function localCertId(thumbprint: string): string {
  return `win-${thumbprint}`;
}

export function isWindowsLocalCert(id: string): boolean {
  return id.startsWith("win-");
}