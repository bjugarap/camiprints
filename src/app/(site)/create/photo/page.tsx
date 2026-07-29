import type { Metadata } from "next";
import { Suspense } from "react";

import { ConverterWizard } from "@/features/converter/ui/converter-wizard";

export const metadata: Metadata = {
  title: "Turn a photo into a coloring page",
  description:
    "Upload a photo and turn it into printable black-and-white line art. Free, private, no account needed.",
  alternates: { canonical: "/create/photo" },
  robots: { index: true },
};

/**
 * The photo converter. The wizard is a client island (it reads the
 * ?handoff= search param, hence the Suspense boundary); everything else on
 * the route is the normal site chrome.
 */
export default function CreatePhotoPage() {
  return (
    <Suspense>
      <ConverterWizard />
    </Suspense>
  );
}
