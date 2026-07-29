import { notFound } from "next/navigation";

import { HandoffSimulator } from "./simulator";

/**
 * Development-only stand-in for the Chrome extension: submits a local
 * image through the real handoff endpoint (no mock path exists) and opens
 * the real deep link. Returns 404 outside development.
 */
export const metadata = { title: "Extension handoff simulator" };

export default function ExtensionHandoffDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HandoffSimulator />;
}
