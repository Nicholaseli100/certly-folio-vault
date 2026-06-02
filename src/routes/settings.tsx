import { createFileRoute } from '@tanstack/react-router'
import EmailTemplateSettings from '../components/certly/EmailTemplateSettings'

// 1. Aqui dizemos ao sistema: "Registre o endereço '/settings' no mapa"
export const Route = createFileRoute('/settings')({
  // 2. Aqui dizemos: "Quando alguém entrar nesse endereço, mostre este componente"
  component: () => (
    <div className="p-6 h-full w-full">
      <EmailTemplateSettings />
    </div>
  ),
})