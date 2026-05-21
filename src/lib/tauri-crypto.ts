import { invoke } from "@tauri-apps/api/core";

const ENCRYPTED_PREFIX = "enc:v1:";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isEncryptedSenhaPfx(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/** Cifra senha_pfx via comando nativo Rust (somente no app desktop). */
export async function encryptSenhaPfx(plaintext: string): Promise<string> {
  if (!plaintext.trim()) return "";
  if (!isTauriRuntime()) {
    throw new Error("A criptografia só está disponível no app desktop (Tauri).");
  }
  return invoke<string>("encrypt_senha_pfx", { plaintext });
}
