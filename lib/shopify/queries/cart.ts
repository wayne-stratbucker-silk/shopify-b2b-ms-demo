import { storefrontQuery, type BuyerContext } from "@/lib/shopify/storefront-client";

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            sku
            title
            product { id handle title vendor featuredImage { url altText } }
            price { amount currencyCode }
          }
        }
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
        attributes { key value }
      }
    }
  }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
  }
  buyerIdentity {
    email
    companyLocation { id name }
  }
`;

export async function getCart(cartId: string, buyer?: BuyerContext) {
  const data = await storefrontQuery<{ cart: unknown }>(
    `query GetCart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`,
    { id: cartId },
    buyer,
  );
  return data.cart;
}

export async function cartCreate(lines: Array<{ merchandiseId: string; quantity: number }>, companyLocationId?: string) {
  const data = await storefrontQuery<{ cartCreate: { cart: { id: string; checkoutUrl: string } } }>(
    `mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`,
    {
      input: {
        lines,
        buyerIdentity: companyLocationId ? { companyLocationId } : undefined,
      },
    },
  );
  return data.cartCreate.cart;
}

export async function cartLinesAdd(cartId: string, lines: Array<{ merchandiseId: string; quantity: number }>) {
  const data = await storefrontQuery<{ cartLinesAdd: { cart: unknown } }>(
    `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`,
    { cartId, lines },
  );
  return data.cartLinesAdd.cart;
}

export async function cartLinesRemove(cartId: string, lineIds: string[]) {
  const data = await storefrontQuery<{ cartLinesRemove: { cart: unknown } }>(
    `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`,
    { cartId, lineIds },
  );
  return data.cartLinesRemove.cart;
}

export async function cartLinesUpdate(cartId: string, lines: Array<{ id: string; quantity: number }>) {
  const data = await storefrontQuery<{ cartLinesUpdate: { cart: unknown } }>(
    `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`,
    { cartId, lines },
  );
  return data.cartLinesUpdate.cart;
}

export async function cartBuyerIdentityUpdate(cartId: string, buyerIdentity: { email?: string; companyLocationId?: string }) {
  const data = await storefrontQuery<{ cartBuyerIdentityUpdate: { cart: unknown } }>(
    `mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }`,
    { cartId, buyerIdentity },
  );
  return data.cartBuyerIdentityUpdate.cart;
}
