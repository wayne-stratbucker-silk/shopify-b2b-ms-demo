import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import "@/components/makeswift/not-found-page";

const NOT_FOUND_PAGE_ID = "acme-b2b-not-found-page";

export default async function NotFound() {
  const snapshot = await client.getComponentSnapshot(NOT_FOUND_PAGE_ID, {
    siteVersion: getSiteVersion(),
  });

  return (
    <MakeswiftComponent
      snapshot={snapshot}
      label="404 Page"
      type="acme/not-found-page"
    />
  );
}
