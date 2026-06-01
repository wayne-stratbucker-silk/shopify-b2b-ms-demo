import { Makeswift } from "@makeswift/runtime/next";
import { runtime } from "./runtime";

const MAKESWIFT_SITE_API_KEY = process.env.MAKESWIFT_SITE_API_KEY ?? "";

export const client = new Makeswift(MAKESWIFT_SITE_API_KEY, { runtime });
