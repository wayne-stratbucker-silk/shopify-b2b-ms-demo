import { adminQuery } from "@/lib/shopify/admin-client";
import type { ShoppingList, ListVisibility } from "@/types";

const METAOBJECT_TYPE = "b2b_shopping_list";

interface ListItem {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  productHandle: string;
  productName?: string;
  imageUrl?: string;
}

interface RawMetaobject {
  id: string;
  updatedAt: string;
  fields: Array<{ key: string; value: string }>;
}

function getField(fields: Array<{ key: string; value: string }>, key: string): string {
  return fields.find((f) => f.key === key)?.value ?? "";
}

function mapList(obj: RawMetaobject): ShoppingList & { rawItems: ListItem[] } {
  const fields = obj.fields;
  const itemsRaw = getField(fields, "items");
  let rawItems: ListItem[] = [];
  try { rawItems = itemsRaw ? JSON.parse(itemsRaw) : []; } catch { /* ignore */ }
  let sharedWith: string[] = [];
  try { const sw = getField(fields, "shared_with"); sharedWith = sw ? JSON.parse(sw) : []; } catch { /* ignore */ }
  // Default to "company" so lists created before scoping existed stay visible.
  const visRaw = getField(fields, "visibility");
  const visibility: ListVisibility = visRaw === "private" || visRaw === "shared" ? visRaw : "company";

  return {
    id: obj.id,
    name: getField(fields, "name"),
    items: rawItems.length,
    lastUsed: obj.updatedAt,
    shared: sharedWith.length,
    note: getField(fields, "description") || undefined,
    owner: getField(fields, "customer_id"),
    companyId: getField(fields, "company_id") || undefined,
    visibility,
    sharedWith,
    rawItems,
  };
}

/** Whether `customerId` may see `list` (owner always can; company/shared per scope). */
export function canAccessList(list: ShoppingList, customerId?: string): boolean {
  if (!customerId) return list.visibility === "company";
  if (list.owner === customerId) return true;
  if (list.visibility === "company") return true;
  if (list.visibility === "shared") return list.sharedWith.includes(customerId);
  return false; // private, not owner
}

export async function getLists(companyId: string, customerId?: string): Promise<ShoppingList[]> {
  const data = await adminQuery<{
    metaobjects: { edges: Array<{ node: RawMetaobject }> };
  }>(
    `query GetShoppingLists($type: String!) {
      metaobjects(type: $type, first: 50) {
        edges {
          node {
            id updatedAt
            fields { key value }
          }
        }
      }
    }`,
    { type: METAOBJECT_TYPE },
  );
  const all = data.metaobjects.edges.map((e) => mapList(e.node));
  return all
    // Same-company scope first…
    .filter((l) => !companyId || l.companyId === companyId)
    // …then per-user visibility (owner / company / shared). When no customerId
    // is supplied (e.g. server contexts without a user), fall back to company scope.
    .filter((l) => canAccessList(l, customerId));
}

export async function getList(id: string): Promise<(ShoppingList & { rawItems: ListItem[] }) | null> {
  const data = await adminQuery<{ metaobject: RawMetaobject | null }>(
    `query GetShoppingList($id: ID!) {
      metaobject(id: $id) { id updatedAt fields { key value } }
    }`,
    { id },
  );
  if (!data.metaobject) return null;
  return mapList(data.metaobject);
}

export async function createList(
  name: string,
  customerId: string,
  companyId?: string,
  description?: string,
  visibility: ListVisibility = "company",
  sharedWith: string[] = [],
): Promise<{ id: string }> {
  const data = await adminQuery<{
    metaobjectCreate: {
      metaobject: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation CreateShoppingList($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id }
        userErrors { message }
      }
    }`,
    {
      metaobject: {
        type: METAOBJECT_TYPE,
        fields: [
          { key: "name", value: name },
          { key: "description", value: description ?? "" },
          { key: "customer_id", value: customerId },
          { key: "company_id", value: companyId ?? "" },
          { key: "items", value: JSON.stringify([]) },
          { key: "visibility", value: visibility },
          { key: "shared_with", value: JSON.stringify(visibility === "shared" ? sharedWith : []) },
        ],
      },
    },
  );
  const errors = data.metaobjectCreate.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data.metaobjectCreate.metaobject) throw new Error("Failed to create list");
  return { id: data.metaobjectCreate.metaobject.id };
}

/** Update a list's name/description and per-user scope (visibility + shared_with). */
export async function updateListScope(
  id: string,
  opts: { name?: string; description?: string; visibility?: ListVisibility; sharedWith?: string[] },
): Promise<void> {
  const fields: Array<{ key: string; value: string }> = [];
  if (opts.name !== undefined) fields.push({ key: "name", value: opts.name });
  if (opts.description !== undefined) fields.push({ key: "description", value: opts.description });
  if (opts.visibility !== undefined) fields.push({ key: "visibility", value: opts.visibility });
  if (opts.sharedWith !== undefined) {
    fields.push({ key: "shared_with", value: JSON.stringify(opts.sharedWith) });
  }
  if (!fields.length) return;
  await adminQuery(
    `mutation UpdateListScope($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) { userErrors { message } }
    }`,
    { id, metaobject: { fields } },
  );
}

export async function addItemToList(listId: string, item: ListItem): Promise<void> {
  const existing = await getList(listId);
  if (!existing) throw new Error("List not found");
  const items = [...existing.rawItems, item];
  await updateListItems(listId, items);
}

export async function removeItemFromList(listId: string, sku: string): Promise<void> {
  const existing = await getList(listId);
  if (!existing) throw new Error("List not found");
  const items = existing.rawItems.filter((i) => i.sku !== sku);
  await updateListItems(listId, items);
}

async function updateListItems(listId: string, items: ListItem[]): Promise<void> {
  await adminQuery(
    `mutation UpdateShoppingList($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        userErrors { message }
      }
    }`,
    {
      id: listId,
      metaobject: { fields: [{ key: "items", value: JSON.stringify(items) }] },
    },
  );
}

export async function deleteList(listId: string): Promise<void> {
  await adminQuery(
    `mutation DeleteShoppingList($id: ID!) {
      metaobjectDelete(id: $id) { userErrors { message } }
    }`,
    { id: listId },
  );
}
