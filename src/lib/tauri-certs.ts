import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-crypto";

export type CertificadoLocal = {
  thumbprint: string;
  subject: string;
  razao_social: string;
  data_emissao: string;
  data_vencimento: string;
};

/** Lê certificados do repositório MY do Windows via Tauri/Rust. */
export async function sincronizarCertificadosLocais(): Promise<CertificadoLocal[]> {
  if (!isTauriRuntime()) {
    throw new Error(
      "A sincronização com o Windows só está disponível no app desktop (Tauri).",
    );
  }
  return invoke<CertificadoLocal[]>("sincronizar_certificados_locais");
}

const CNPJ_IN_SUBJECT =
  /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14}/;

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
