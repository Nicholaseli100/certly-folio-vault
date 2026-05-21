use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct CertificadoLocal {
    pub thumbprint: String,
    pub subject: String,
    pub razao_social: String,
    pub data_emissao: String,
    pub data_vencimento: String,
}

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::CertificadoLocal;
    use chrono::{DateTime, Utc};
    use std::ptr;
    use windows_sys::Win32::Foundation::FILETIME;
    use windows_sys::Win32::Security::Cryptography::{
        CertCloseStore, CertEnumCertificatesInStore, CertGetCertificateContextProperty,
        CertGetNameStringW, CertOpenSystemStoreW, CERT_CONTEXT, CERT_HASH_PROP_ID,
        CERT_NAME_RDN_TYPE, CERT_NAME_SIMPLE_DISPLAY_TYPE,
    };

    const MY_STORE_NAME: &[u16] = &[77, 89, 0]; // "MY\0"

    pub fn list_my_store_certificates() -> Result<Vec<CertificadoLocal>, String> {
        unsafe {
            let store = CertOpenSystemStoreW(0, MY_STORE_NAME.as_ptr());
            if store.is_null() {
                return Err("Não foi possível abrir o repositório de certificados MY.".into());
            }

            let mut found = Vec::new();
            let mut prev: *const CERT_CONTEXT = ptr::null();

            loop {
                let ctx = CertEnumCertificatesInStore(store, prev);
                if ctx.is_null() {
                    break;
                }
                if let Some(cert) = parse_certificate(ctx) {
                    found.push(cert);
                }
                prev = ctx;
            }

            CertCloseStore(store, 0);
            Ok(found)
        }
    }

    unsafe fn parse_certificate(ctx: *const CERT_CONTEXT) -> Option<CertificadoLocal> {
        let info = (*ctx).pCertInfo;
        if info.is_null() {
            return None;
        }

        let thumbprint = read_thumbprint(ctx)?;
        let subject = cert_display_name(ctx, CERT_NAME_RDN_TYPE)
            .or_else(|| cert_display_name(ctx, CERT_NAME_SIMPLE_DISPLAY_TYPE))
            .unwrap_or_else(|| "Certificado sem nome".to_string());
        let razao_social = cert_display_name(ctx, CERT_NAME_SIMPLE_DISPLAY_TYPE)
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| extract_cn(&subject).unwrap_or_else(|| subject.clone()));

        let not_before = filetime_to_iso_date((*info).NotBefore);
        let not_after = filetime_to_iso_date((*info).NotAfter);

        Some(CertificadoLocal {
            thumbprint,
            subject,
            razao_social,
            data_emissao: not_before,
            data_vencimento: not_after,
        })
    }

    unsafe fn read_thumbprint(ctx: *const CERT_CONTEXT) -> Option<String> {
        let mut len: u32 = 0;
        if CertGetCertificateContextProperty(
            ctx,
            CERT_HASH_PROP_ID,
            ptr::null_mut(),
            &mut len,
        ) == 0
        {
            return None;
        }
        let mut buf = vec![0u8; len as usize];
        if CertGetCertificateContextProperty(
            ctx,
            CERT_HASH_PROP_ID,
            buf.as_mut_ptr(),
            &mut len,
        ) == 0
        {
            return None;
        }
        buf.truncate(len as usize);
        Some(buf.iter().map(|b| format!("{b:02X}")).collect::<String>())
    }

    unsafe fn cert_display_name(ctx: *const CERT_CONTEXT, name_type: u32) -> Option<String> {
        let size = CertGetNameStringW(
            ctx,
            name_type,
            0,
            ptr::null(),
            ptr::null_mut(),
            0,
        );
        if size <= 1 {
            return None;
        }

        let mut buf = vec![0u16; size as usize];
        let written = CertGetNameStringW(
            ctx,
            name_type,
            0,
            ptr::null(),
            buf.as_mut_ptr(),
            size,
        );
        if written <= 1 {
            return None;
        }

        let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        Some(String::from_utf16_lossy(&buf[..end]))
    }

    fn filetime_to_iso_date(ft: FILETIME) -> String {
        let ticks = ((ft.dwHighDateTime as u64) << 32) | (ft.dwLowDateTime as u64);
        if ticks == 0 {
            return String::new();
        }

        let unix_secs = (ticks / 10_000_000) as i64 - 11_644_473_600;
        match DateTime::<Utc>::from_timestamp(unix_secs, 0) {
            Some(dt) => dt.format("%Y-%m-%d").to_string(),
            None => String::new(),
        }
    }

    fn extract_cn(subject: &str) -> Option<String> {
        for part in subject.split(',') {
            let trimmed = part.trim();
            if let Some(cn) = trimmed.strip_prefix("CN=") {
                return Some(cn.trim().to_string());
            }
        }
        None
    }
}

#[cfg(not(target_os = "windows"))]
mod windows_impl {
    use super::CertificadoLocal;

    pub fn list_my_store_certificates() -> Result<Vec<CertificadoLocal>, String> {
        Err("A sincronização com o repositório Windows só está disponível no app desktop para Windows.".into())
    }
}

pub fn list_my_store_certificates() -> Result<Vec<CertificadoLocal>, String> {
    windows_impl::list_my_store_certificates()
}

#[tauri::command]
pub fn sincronizar_certificados_locais() -> Result<Vec<CertificadoLocal>, String> {
    list_my_store_certificates()
}
