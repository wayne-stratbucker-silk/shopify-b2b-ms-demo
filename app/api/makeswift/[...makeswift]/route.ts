import { MakeswiftApiHandler } from "@makeswift/runtime/next/server";
import { runtime } from "@/lib/makeswift/runtime";
import "@/components/makeswift/register";

const handler = MakeswiftApiHandler(
  process.env.MAKESWIFT_SITE_API_KEY ?? "",
  { runtime },
);

export { handler as GET, handler as POST, handler as OPTIONS };
