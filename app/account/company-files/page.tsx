import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listCompanyFiles, toFileView } from "@/lib/b2b/company-files";
import { CompanyFilesTable } from "@/components/account/company-files-table";

export const dynamic = "force-dynamic";

export default async function CompanyFilesPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/company-files");

  const files = session.companyId ? await listCompanyFiles(session.companyId) : [];
  const canUpload = hasPermission(session.permissions, "company.settings.manage");

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 8 }}>Company files</h1>
      <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 24 }}>
        Shared documents for {session.companyName || "your company"} — contracts, price sheets,
        certificates and record attachments.
      </p>
      <CompanyFilesTable files={files.map(toFileView)} canUpload={canUpload} />
    </div>
  );
}
