use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use rand::RngCore;

/// Chave de desenvolvimento (32 bytes). Substituir por derivação segura em produção.
const DEV_MASTER_KEY: [u8; 32] = *b"certly-dev-master-key-32bytes!!!";

pub const ENCRYPTED_PREFIX: &str = "enc:v1:";

pub fn encrypt_senha_pfx(plaintext: &str) -> Result<String, String> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }

    if plaintext.starts_with(ENCRYPTED_PREFIX) {
        return Ok(plaintext.to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(&DEV_MASTER_KEY)
        .map_err(|e| format!("Falha ao inicializar cifra: {e}"))?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Falha ao criptografar: {e}"))?;

    let mut payload = Vec::with_capacity(12 + ciphertext.len());
    payload.extend_from_slice(&nonce_bytes);
    payload.extend_from_slice(&ciphertext);

    Ok(format!("{ENCRYPTED_PREFIX}{}", STANDARD.encode(payload)))
}

#[tauri::command(rename = "encrypt_senha_pfx")]
pub fn encrypt_senha_pfx_command(plaintext: String) -> Result<String, String> {
    encrypt_senha_pfx(&plaintext)
}
