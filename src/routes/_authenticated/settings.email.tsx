import { createFileRoute } from "@tanstack/react-router";
import { EmailTemplateSettings } from "@/components/certly/EmailTemplateSettings";

export const Route = createFileRoute("/_authenticated/settings/email")({
  component: EmailTemplateSettings,
});
