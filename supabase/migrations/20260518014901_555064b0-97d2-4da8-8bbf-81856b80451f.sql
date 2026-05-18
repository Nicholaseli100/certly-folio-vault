-- Tabela de certificados
CREATE TABLE public.certificados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_emissao DATE,
  data_vencimento DATE NOT NULL,
  senha_pfx TEXT NOT NULL DEFAULT '',
  nome_responsavel TEXT NOT NULL DEFAULT '',
  email_contato TEXT NOT NULL DEFAULT '',
  whatsapp_contato TEXT NOT NULL DEFAULT '',
  notificar_email BOOLEAN NOT NULL DEFAULT true,
  notificar_whatsapp BOOLEAN NOT NULL DEFAULT false,
  url_arquivo_pfx TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificados_user_id ON public.certificados(user_id);
CREATE INDEX idx_certificados_vencimento ON public.certificados(data_vencimento);

ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios certificados"
  ON public.certificados FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios certificados"
  ON public.certificados FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios certificados"
  ON public.certificados FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover seus próprios certificados"
  ON public.certificados FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_certificados_updated_at
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado de arquivos .pfx
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-pfx', 'certificados-pfx', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: arquivos organizados em pastas pelo user_id
CREATE POLICY "Usuários podem ver seus próprios arquivos PFX"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificados-pfx'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários podem enviar seus próprios arquivos PFX"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'certificados-pfx'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários podem atualizar seus próprios arquivos PFX"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'certificados-pfx'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários podem remover seus próprios arquivos PFX"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'certificados-pfx'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );