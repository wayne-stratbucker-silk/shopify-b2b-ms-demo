import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listCompanyFiles,
  listRecordFiles,
  toFileView,
  uploadCompanyFile,
  createCompanyFileFromUrl,
  type RecordType,
} from "@/lib/b2b/company-files";

export const dynamic = "force-dynamic";

const RECORD_TYPES: RecordType[] = ["general", "invoice", "order", "quote"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB, matching the catalyst limit

function normType(v: string | null): RecordType | undefined {
  return v && (RECORD_TYPES as string[]).includes(v) ? (v as RecordType) : undefined;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.companyId) return NextResponse.json({ files: [] });

  const url = new URL(req.url);
  const recordType = normType(url.searchParams.get("recordType"));
  const recordId = url.searchParams.get("recordId");

  const records = recordType && recordId
    ? await listRecordFiles(session.companyId, recordType, recordId)
    : await listCompanyFiles(session.companyId);

  return NextResponse.json({ files: records.map(toFileView) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("settings");
  if (guard) return guard;
  // Uploading company documents is an admin-level action.
  if (!hasPermission(session.permissions, "company.settings.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";

  // Multipart: real file upload via staged upload.
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10 MB" }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadCompanyFile({
      companyGid: session.companyId,
      title: String(form.get("title") || file.name),
      category: String(form.get("category") || ""),
      recordType: normType(String(form.get("recordType") || "")) ?? "general",
      recordId: String(form.get("recordId") || ""),
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      bytes,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json({ ok: true, id: result.id });
  }

  // JSON: attach a document by URL.
  let body: { sourceUrl?: string; title?: string; category?: string; recordType?: string; recordId?: string } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (!body.sourceUrl) return NextResponse.json({ error: "sourceUrl or file required" }, { status: 400 });

  const result = await createCompanyFileFromUrl({
    companyGid: session.companyId,
    sourceUrl: body.sourceUrl,
    title: body.title || "Document",
    category: body.category || "",
    recordType: normType(body.recordType ?? null) ?? "general",
    recordId: body.recordId || "",
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, id: result.id });
}
