import PasswordGateForm from "@/components/web/_links/password-gate-form";
import { redirect } from "next/navigation";

/**
 * Password gate for protected links on custom domains. The middleware
 * rewrites here (it can't 302 from the edge); `domain` is the custom host
 * the link was clicked on and is forwarded to the verify API, which matches
 * on slug + domain.
 */
export default async function CustomDomainPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; domain?: string }>;
}) {
  const { slug, domain } = await searchParams;

  if (!slug?.trim() || !domain?.trim()) {
    redirect("/custom-domain/not-found");
  }

  return <PasswordGateForm slug={slug.trim()} domain={domain.trim()} />;
}
