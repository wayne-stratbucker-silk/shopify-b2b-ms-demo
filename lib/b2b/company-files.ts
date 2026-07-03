// Company file repository & record attachments — Shopify-native.
//
// Replaces catalyst's BigCommerce WebDAV /content/ repository entirely. Files
// live in Shopify Files (fileCreate → GenericFile); a `company_file` metaobject
// links each file to a company (by GID) and, optionally, a record
// (invoice / order / quote). Listing filters metaobjects by company; downloads
// go through an entitlement proxy so the public CDN URL is never emitted to a
// client that isn't scoped to that company.

import { adminQuery } from "@/lib/shopify/admin-client";

export const COMPANY_FILE_TYPE = "company_file";

export type RecordType = "general" | "invoice" | "order" | "quote";

/** Server-side record — includes the resolved (public) CDN url. */
export interface CompanyFileRecord {
  id: string;            // metaobject GID
  company: string;       // Company GID
  title: string;
  category: string;
  recordType: RecordType;
  recordId: string;
  url: string;           // Shopify CDN url — NEVER send directly to the client
  mimeType: string;
  size?: number;
  updatedAt: string;
}

/** Client-safe view — url replaced by an entitlement-checked proxy href. */
export interface CompanyFileView {
  id: string;
  title: string;
  category: string;
  recordType: RecordType;
  recordId: string;
  mimeType: string;
  size?: number;
  updatedAt: string;
  downloadHref: string;
}

export function toFileView(f: CompanyFileRecord): CompanyFileView {
  return {
    id: f.id,
    title: f.title,
    category: f.category,
    recordType: f.recordType,
    recordId: f.recordId,
    mimeType: f.mimeType,
    size: f.size,
    updatedAt: f.updatedAt,
    downloadHref: `/api/account/company-files/download?id=${encodeURIComponent(f.id)}`,
  };
}

interface MetaobjectNode {
  id: string;
  updatedAt: string;
  fields: Array<{ key: string; value: string | null }>;
  file: {
    reference:
      | { __typename: "GenericFile"; url?: string | null; mimeType?: string | null; originalFileSize?: number | null }
      | { __typename: "MediaImage"; image?: { url?: string | null } | null; mimeType?: string | null }
      | null;
  } | null;
}

const FILE_NODE = `
  id
  updatedAt
  fields { key value }
  file: field(key: "file") {
    reference {
      __typename
      ... on GenericFile { url mimeType originalFileSize }
      ... on MediaImage { image { url } mimeType }
    }
  }
`;

function fieldVal(node: MetaobjectNode, key: string): string {
  return node.fields.find((f) => f.key === key)?.value ?? "";
}

function mapNode(node: MetaobjectNode): CompanyFileRecord | null {
  const ref = node.file?.reference;
  let url = "";
  let mimeType = "";
  let size: number | undefined;
  if (ref?.__typename === "GenericFile") {
    url = ref.url ?? "";
    mimeType = ref.mimeType ?? "";
    size = ref.originalFileSize ?? undefined;
  } else if (ref?.__typename === "MediaImage") {
    url = ref.image?.url ?? "";
    mimeType = ref.mimeType ?? "";
  }
  if (!url) return null; // file still processing / missing — skip
  const rt = (fieldVal(node, "record_type") || "general") as RecordType;
  return {
    id: node.id,
    company: fieldVal(node, "company"),
    title: fieldVal(node, "title") || "Document",
    category: fieldVal(node, "category"),
    recordType: rt,
    recordId: fieldVal(node, "record_id"),
    url,
    mimeType,
    size,
    updatedAt: node.updatedAt,
  };
}

/** All company files (any record type) for the given company GID. */
export async function listCompanyFiles(companyGid: string): Promise<CompanyFileRecord[]> {
  const data = await adminQuery<{ metaobjects: { edges: Array<{ node: MetaobjectNode }> } }>(
    `query CompanyFiles {
      metaobjects(type: "${COMPANY_FILE_TYPE}", first: 250) {
        edges { node { ${FILE_NODE} } }
      }
    }`,
  ).catch(() => ({ metaobjects: { edges: [] } }));

  return data.metaobjects.edges
    .map((e) => mapNode(e.node))
    .filter((f): f is CompanyFileRecord => !!f && f.company === companyGid);
}

/** Files attached to a specific record (invoice / order / quote) for a company. */
export async function listRecordFiles(
  companyGid: string,
  recordType: RecordType,
  recordId: string,
): Promise<CompanyFileRecord[]> {
  const all = await listCompanyFiles(companyGid);
  return all.filter((f) => f.recordType === recordType && f.recordId === String(recordId));
}

/** Single record by metaobject id — used by the entitlement download proxy. */
export async function getCompanyFileById(id: string): Promise<CompanyFileRecord | null> {
  const data = await adminQuery<{ metaobject: MetaobjectNode | null }>(
    `query CompanyFile($id: ID!) { metaobject(id: $id) { ${FILE_NODE} } }`,
    { id },
  ).catch(() => ({ metaobject: null }));
  return data.metaobject ? mapNode(data.metaobject) : null;
}

// ─── Definition (idempotent) — used by the seed script ───

export async function ensureCompanyFileDefinition(): Promise<void> {
  const existing = await adminQuery<{ metaobjectDefinitionByType: { id: string } | null }>(
    `query { metaobjectDefinitionByType(type: "${COMPANY_FILE_TYPE}") { id } }`,
  ).catch(() => ({ metaobjectDefinitionByType: null }));
  if (existing.metaobjectDefinitionByType) return;

  await adminQuery(
    `mutation CreateCompanyFileDef($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`,
    {
      definition: {
        name: "Company File",
        type: COMPANY_FILE_TYPE,
        fieldDefinitions: [
          { name: "Company", key: "company", type: "single_line_text_field" },
          { name: "File", key: "file", type: "file_reference" },
          { name: "Record type", key: "record_type", type: "single_line_text_field" },
          { name: "Record id", key: "record_id", type: "single_line_text_field" },
          { name: "Category", key: "category", type: "single_line_text_field" },
          { name: "Title", key: "title", type: "single_line_text_field" },
        ],
      },
    },
  );
}

// ─── Create ───

interface CreateInput {
  companyGid: string;
  title: string;
  recordType?: RecordType;
  recordId?: string;
  category?: string;
}

async function createMetaobject(fileId: string, input: CreateInput): Promise<{ id: string } | { error: string }> {
  const data = await adminQuery<{
    metaobjectCreate: { metaobject: { id: string } | null; userErrors: Array<{ message: string }> };
  }>(
    `mutation CreateCompanyFile($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message code }
      }
    }`,
    {
      metaobject: {
        type: COMPANY_FILE_TYPE,
        fields: [
          { key: "company", value: input.companyGid },
          { key: "file", value: fileId },
          { key: "record_type", value: input.recordType ?? "general" },
          { key: "record_id", value: input.recordId ?? "" },
          { key: "category", value: input.category ?? "" },
          { key: "title", value: input.title },
        ],
      },
    },
  ).catch(() => null);
  const errs = data?.metaobjectCreate?.userErrors ?? [];
  const id = data?.metaobjectCreate?.metaobject?.id;
  if (!id) return { error: errs[0]?.message || "Failed to create company file" };
  return { id };
}

/** Create a company file from an external document URL (used by the seed + URL attach). */
export async function createCompanyFileFromUrl(
  input: CreateInput & { sourceUrl: string; contentType?: "FILE" | "IMAGE" },
): Promise<{ id: string } | { error: string }> {
  const file = await adminQuery<{
    fileCreate: { files: Array<{ id: string }>; userErrors: Array<{ message: string }> };
  }>(
    `mutation CreateFile($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id }
        userErrors { field message }
      }
    }`,
    { files: [{ originalSource: input.sourceUrl, contentType: input.contentType ?? "FILE", alt: input.title }] },
  ).catch(() => null);
  const fileId = file?.fileCreate?.files?.[0]?.id;
  if (!fileId) return { error: file?.fileCreate?.userErrors?.[0]?.message || "Failed to create file" };
  return createMetaobject(fileId, input);
}

/** Upload raw bytes via a staged upload, then attach as a company file. */
export async function uploadCompanyFile(
  input: CreateInput & { filename: string; contentType: string; bytes: Buffer },
): Promise<{ id: string } | { error: string }> {
  // 1. Staged upload target
  const staged = await adminQuery<{
    stagedUploadsCreate: {
      stagedTargets: Array<{ url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> }>;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation StagedUploads($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    { input: [{ filename: input.filename, mimeType: input.contentType, resource: "FILE", httpMethod: "POST" }] },
  ).catch(() => null);

  const target = staged?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) return { error: staged?.stagedUploadsCreate?.userErrors?.[0]?.message || "Could not stage upload" };

  // 2. POST the bytes to the staged target
  try {
    const form = new FormData();
    for (const p of target.parameters) form.append(p.name, p.value);
    form.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.contentType }), input.filename);
    const res = await fetch(target.url, { method: "POST", body: form });
    if (!res.ok) return { error: `Upload failed (${res.status})` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }

  // 3. fileCreate from the staged resource, 4. link metaobject
  const file = await adminQuery<{
    fileCreate: { files: Array<{ id: string }>; userErrors: Array<{ message: string }> };
  }>(
    `mutation CreateFile($files: [FileCreateInput!]!) {
      fileCreate(files: $files) { files { id } userErrors { field message } }
    }`,
    { files: [{ originalSource: target.resourceUrl, contentType: "FILE", alt: input.title }] },
  ).catch(() => null);
  const fileId = file?.fileCreate?.files?.[0]?.id;
  if (!fileId) return { error: file?.fileCreate?.userErrors?.[0]?.message || "Failed to create file" };
  return createMetaobject(fileId, input);
}
