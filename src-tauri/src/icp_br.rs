//! Extração de CNPJ, CPF e e-mail conforme OIDs ICP-Brasil.

pub const OID_CNPJ: &str = "2.16.76.1.3.3";
pub const OID_CPF: &str = "2.16.76.1.3.1";
pub const OID_EMAIL: &str = "1.2.840.113549.1.9.1";

const ALT_NAME_OTHER: u32 = 1;
const ALT_NAME_RFC822: u32 = 2;

#[derive(Debug, Default, Clone)]
pub struct IcpBrFields {
    pub cnpj_cpf: String,
    pub email_contato: String,
}

pub fn format_cnpj(digits: &str) -> String {
    let d: String = digits.chars().filter(|c| c.is_ascii_digit()).collect();
    if d.len() != 14 {
        return d;
    }
    format!(
        "{}.{}.{}/{}-{}",
        &d[0..2],
        &d[2..5],
        &d[5..8],
        &d[8..12],
        &d[12..14]
    )
}

pub fn format_cpf(digits: &str) -> String {
    let d: String = digits.chars().filter(|c| c.is_ascii_digit()).collect();
    if d.len() != 11 {
        return d;
    }
    format!("{}.{}.{}-{}", &d[0..3], &d[3..6], &d[6..9], &d[9..11])
}

pub fn digits_only(value: &str) -> String {
    value.chars().filter(|c| c.is_ascii_digit()).collect()
}

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::{
        digits_only, format_cnpj, format_cpf, IcpBrFields, OID_CNPJ, OID_CPF, OID_EMAIL,
        ALT_NAME_OTHER, ALT_NAME_RFC822,
    };
    use std::ffi::{c_void, CStr};
    use std::ptr;
    use windows_sys::Win32::Security::Cryptography::{
        CertFindExtension, CryptDecodeObjectEx, CERT_ALT_NAME_INFO, CERT_CONTEXT, CERT_EXTENSION,
        CERT_NAME_INFO, CRYPT_INTEGER_BLOB,
        PKCS_7_ASN_ENCODING, X509_ASN_ENCODING,
    };

    const X509_ENCODING: u32 = X509_ASN_ENCODING | PKCS_7_ASN_ENCODING;
    const SAN_OID: &[u8] = b"2.5.29.17\0";
    const X509_NAME_OID: &[u8] = b"2.5.4.49\0";

    pub fn extract_icp_fields(ctx: *const CERT_CONTEXT, subject_text: &str) -> IcpBrFields {
        let mut fields = IcpBrFields::default();
        let info = unsafe { (*ctx).pCertInfo };
        if info.is_null() {
            return fallback_from_subject_text(subject_text);
        }

        let (cnpj, cpf, email_dn) = unsafe { extract_from_subject_dn(&(*info).Subject) };
        let (cnpj_san, cpf_san, email_san) =
            unsafe { extract_from_extensions((*info).cExtension, (*info).rgExtension) };

        let cnpj_raw = cnpj.or(cnpj_san);
        let cpf_raw = cpf.or(cpf_san);
        let email = email_san.or(email_dn);

        fields.cnpj_cpf = cnpj_raw
            .map(|d| format_cnpj(&d))
            .or_else(|| cpf_raw.map(|d| format_cpf(&d)))
            .unwrap_or_default();

        fields.email_contato = email.unwrap_or_default();

        if fields.cnpj_cpf.is_empty() || fields.email_contato.is_empty() {
            let fallback = fallback_from_subject_text(subject_text);
            if fields.cnpj_cpf.is_empty() {
                fields.cnpj_cpf = fallback.cnpj_cpf;
            }
            if fields.email_contato.is_empty() {
                fields.email_contato = fallback.email_contato;
            }
        }

        fields
    }

    fn fallback_from_subject_text(subject: &str) -> IcpBrFields {
        let mut fields = IcpBrFields::default();
        let upper = subject.to_uppercase();

        if let Some(cnpj) = find_labeled_digits(&upper, &["CNPJ", "2.16.76.1.3.3"]) {
            let d = digits_only(&cnpj);
            if d.len() == 14 {
                fields.cnpj_cpf = format_cnpj(&d);
            }
        }

        if fields.cnpj_cpf.is_empty() {
            if let Some(cpf) = find_labeled_digits(&upper, &["CPF", "2.16.76.1.3.1"]) {
                let d = digits_only(&cpf);
                if d.len() == 11 {
                    fields.cnpj_cpf = format_cpf(&d);
                }
            }
        }

        if fields.cnpj_cpf.is_empty() {
            for chunk in subject.split(|c: char| !c.is_ascii_digit()) {
                if chunk.len() == 14 {
                    fields.cnpj_cpf = format_cnpj(chunk);
                    break;
                }
                if chunk.len() == 11 {
                    fields.cnpj_cpf = format_cpf(chunk);
                }
            }
        }

        for part in subject.split(',') {
            let trimmed = part.trim();
            if let Some(email) = trimmed
                .strip_prefix("E=")
                .or_else(|| trimmed.strip_prefix("emailAddress="))
            {
                fields.email_contato = email.trim().to_string();
                break;
            }
        }

        fields
    }

    fn find_labeled_digits(text: &str, labels: &[&str]) -> Option<String> {
        for label in labels {
            if let Some(idx) = text.find(label) {
                let tail = &text[idx + label.len()..];
                let digits: String = tail
                    .chars()
                    .skip_while(|c| !c.is_ascii_digit())
                    .take_while(|c| c.is_ascii_digit())
                    .collect();
                if !digits.is_empty() {
                    return Some(digits);
                }
            }
        }
        None
    }

    unsafe fn extract_from_subject_dn(
        subject: &CRYPT_INTEGER_BLOB,
    ) -> (Option<String>, Option<String>, Option<String>) {
        if subject.pbData.is_null() || subject.cbData == 0 {
            return (None, None, None);
        }

        let data = std::slice::from_raw_parts(subject.pbData, subject.cbData as usize);
        let Some(buf) = decode_object_buffer(X509_NAME_OID, data) else {
            return (None, None, None);
        };

        if buf.len() < std::mem::size_of::<CERT_NAME_INFO>() {
            return (None, None, None);
        }

        let name_info = &*(buf.as_ptr() as *const CERT_NAME_INFO);
        parse_name_info(name_info)
    }

    unsafe fn extract_from_extensions(
        c_extension: u32,
        rg_extension: *mut CERT_EXTENSION,
    ) -> (Option<String>, Option<String>, Option<String>) {
        if c_extension == 0 || rg_extension.is_null() {
            return (None, None, None);
        }

        let mut cnpj = None;
        let mut cpf = None;
        let mut email = None;

        let san = CertFindExtension(SAN_OID.as_ptr(), c_extension, rg_extension);
        if !san.is_null() {
            let (c, p, e) = parse_san_extension(&(*san).Value);
            cnpj = cnpj.or(c);
            cpf = cpf.or(p);
            email = email.or(e);
        }

        for i in 0..c_extension as isize {
            let ext = rg_extension.offset(i);
            if (*ext).Value.pbData.is_null() {
                continue;
            }
            let blob = std::slice::from_raw_parts((*ext).Value.pbData, (*ext).Value.cbData as usize);
            let (c, p, e) = scan_raw_extension(blob);
            cnpj = cnpj.or(c);
            cpf = cpf.or(p);
            email = email.or(e);
        }

        (cnpj, cpf, email)
    }

    unsafe fn parse_name_info(
        name_info: &CERT_NAME_INFO,
    ) -> (Option<String>, Option<String>, Option<String>) {
        let mut cnpj = None;
        let mut cpf = None;
        let mut email = None;

        for rdn in 0..name_info.cRDN {
            let rdn_entry = name_info.rgRDN.add(rdn as usize);
            if rdn_entry.is_null() {
                continue;
            }
            for attr_i in 0..(*rdn_entry).cRDNAttr {
                let attr = (*rdn_entry).rgRDNAttr.add(attr_i as usize);
                if attr.is_null() {
                    continue;
                }
                let oid = oid_to_string((*attr).pszObjId);
                let value = decode_blob_value(&(*attr).Value);
                match oid.as_str() {
                    OID_CNPJ => cnpj = pick_cnpj_digits(&value).or(cnpj),
                    OID_CPF => cpf = pick_cpf_digits(&value).or(cpf),
                    OID_EMAIL => email = Some(value.trim().to_string()),
                    _ => {}
                }
            }
        }

        (cnpj, cpf, email)
    }

    fn parse_san_extension(
        value: &CRYPT_INTEGER_BLOB,
    ) -> (Option<String>, Option<String>, Option<String>) {
        if value.pbData.is_null() || value.cbData == 0 {
            return (None, None, None);
        }

        unsafe {
            let data = std::slice::from_raw_parts(value.pbData, value.cbData as usize);
            if let Some(buf) = decode_object_buffer(SAN_OID, data) {
                if buf.len() >= std::mem::size_of::<CERT_ALT_NAME_INFO>() {
                    let alt_info = &*(buf.as_ptr() as *const CERT_ALT_NAME_INFO);
                    return parse_alt_name_info(alt_info);
                }
            }
            scan_raw_extension(data)
        }
    }

    unsafe fn parse_alt_name_info(
        alt_info: &CERT_ALT_NAME_INFO,
    ) -> (Option<String>, Option<String>, Option<String>) {
        let mut cnpj = None;
        let mut cpf = None;
        let mut email = None;

        for i in 0..alt_info.cAltEntry {
            let entry = alt_info.rgAltEntry.add(i as usize);
            if entry.is_null() {
                continue;
            }

            match (*entry).dwAltNameChoice {
                ALT_NAME_OTHER => {
                    let other = (*entry).Anonymous.pOtherName;
                    if other.is_null() {
                        continue;
                    }
                    let oid = oid_to_string((*other).pszObjId);
                    let value = decode_blob_value(&(*other).Value);
                    match oid.as_str() {
                        OID_CNPJ => cnpj = pick_cnpj_digits(&value).or(cnpj),
                        OID_CPF => cpf = pick_cpf_digits(&value).or(cpf),
                        _ => {}
                    }
                }
                ALT_NAME_RFC822 => {
                    let w = (*entry).Anonymous.pwszRfc822Name;
                    if !w.is_null() {
                        let len = (0..).take_while(|&j| *w.offset(j) != 0).count();
                        let slice = std::slice::from_raw_parts(w, len);
                        email = Some(String::from_utf16_lossy(slice));
                    }
                }
                _ => {}
            }
        }

        (cnpj, cpf, email)
    }

    fn scan_raw_extension(blob: &[u8]) -> (Option<String>, Option<String>, Option<String>) {
        let mut cnpj = None;
        let mut cpf = None;

        if let Some(pos) = find_subslice(blob, OID_CNPJ.as_bytes()) {
            if let Some(d) = extract_digits_near(blob, pos + OID_CNPJ.len()) {
                cnpj = pick_cnpj_digits(&d);
            }
        }

        if cnpj.is_none() {
            if let Some(pos) = find_subslice(blob, OID_CPF.as_bytes()) {
                if let Some(d) = extract_digits_near(blob, pos + OID_CPF.len()) {
                    cpf = pick_cpf_digits(&d);
                }
            }
        }

        (cnpj, cpf, None)
    }

    fn pick_cnpj_digits(value: &str) -> Option<String> {
        let d = digits_only(value);
        if d.len() == 14 {
            Some(d)
        } else {
            None
        }
    }

    fn pick_cpf_digits(value: &str) -> Option<String> {
        let d = digits_only(value);
        if d.len() == 11 {
            Some(d)
        } else {
            None
        }
    }

    fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
        haystack
            .windows(needle.len())
            .position(|window| window == needle)
    }

    fn extract_digits_near(blob: &[u8], start: usize) -> Option<String> {
        let tail = blob.get(start..)?;
        let digits: String = tail
            .iter()
            .copied()
            .filter(|b| b.is_ascii_digit())
            .map(|b| b as char)
            .collect();
        if digits.is_empty() {
            return None;
        }
        Some(digits)
    }

    fn oid_to_string(oid: windows_sys::core::PSTR) -> String {
        if oid.is_null() {
            return String::new();
        }
        unsafe { CStr::from_ptr(oid as *const i8) }
            .to_string_lossy()
            .into_owned()
    }

    fn decode_blob_value(blob: &CRYPT_INTEGER_BLOB) -> String {
        if blob.pbData.is_null() || blob.cbData == 0 {
            return String::new();
        }
        let data = unsafe { std::slice::from_raw_parts(blob.pbData, blob.cbData as usize) };

        if data.len() >= 2 && data.len() % 2 == 0 && data[1] == 0 {
            let utf16: Vec<u16> = data
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .take_while(|&c| c != 0)
                .collect();
            return String::from_utf16_lossy(&utf16);
        }

        String::from_utf8_lossy(data).into_owned()
    }

    unsafe fn decode_object_buffer(oid: &[u8], encoded: &[u8]) -> Option<Vec<u8>> {
        let mut size: u32 = 0;
        if CryptDecodeObjectEx(
            X509_ENCODING,
            oid.as_ptr(),
            encoded.as_ptr(),
            encoded.len() as u32,
            0,
            ptr::null(),
            ptr::null_mut(),
            &mut size,
        ) == 0
        {
            return None;
        }

        let mut buf = vec![0u8; size as usize];
        if CryptDecodeObjectEx(
            X509_ENCODING,
            oid.as_ptr(),
            encoded.as_ptr(),
            encoded.len() as u32,
            0,
            ptr::null(),
            buf.as_mut_ptr().cast::<c_void>(),
            &mut size,
        ) == 0
        {
            return None;
        }

        buf.truncate(size as usize);
        Some(buf)
    }
}

#[cfg(target_os = "windows")]
pub use windows_impl::extract_icp_fields;
