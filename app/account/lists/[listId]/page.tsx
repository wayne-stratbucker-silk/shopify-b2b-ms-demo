import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getList } from "@/lib/lists/client";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

interface Props { params: Promise<{ listId: string }> }

export default async function ListDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/lists");

  const { listId } = await params;
  const list = await getList(decodeURIComponent(listId)).catch(() => null);
  if (!list) return notFound();

  const subtotal = list.rawItems.reduce((s, i) => s + (i.quantity ?? 1), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/account/lists" className="text-sm" style={{ color: "var(--muted)" }}>← Shopping Lists</Link>
        <h1 className="text-h1" style={{ marginTop: 8 }}>{list.name}</h1>
        {list.note && <p className="text-body" style={{ color: "var(--muted)", marginTop: 4 }}>{list.note}</p>}
      </div>

      {list.rawItems.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          This list is empty. Add products from any product page.
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto", marginBottom: 24 }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Actions</th></tr></thead>
            <tbody>
              {list.rawItems.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>
                    <Link href={`/products/${item.productHandle}`} style={{ color: "var(--primary)" }}>
                      {item.productName ?? item.sku}
                    </Link>
                  </td>
                  <td className="text-mono text-sm">{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <form action={`/api/lists/${encodeURIComponent(list.id)}/items/${encodeURIComponent(item.sku)}`} method="POST" style={{ display: "inline" }}>
                      <input type="hidden" name="_method" value="DELETE" />
                      <button type="submit" className="text-sm" style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.rawItems.length > 0 && (
        <div style={{ display: "flex", gap: 12 }}>
          <form action="/api/cart/add-bulk" method="POST" style={{ display: "flex", gap: 12 }}>
            {list.rawItems.map((item, i) => (
              <input key={i} type="hidden" name="items" value={JSON.stringify(item)} />
            ))}
            <button type="submit" className="btn btn-primary">Add All to Cart</button>
          </form>
          <p className="text-sm" style={{ color: "var(--muted)", alignSelf: "center" }}>
            {list.rawItems.length} items · {subtotal} total qty
          </p>
        </div>
      )}
    </div>
  );
}
