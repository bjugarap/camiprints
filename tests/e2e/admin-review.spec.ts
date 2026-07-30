import { expect, test } from "@playwright/test";

/**
 * Read-only smoke for the coloring-page review queue (dev-only tooling).
 * Review WRITES are covered by unit tests against the pure helpers — e2e
 * must not mutate the real generation manifest.
 */
test.describe("coloring review queue", () => {
  test("renders the queue grouped by category", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop-only tool");
    await page.goto("/admin/coloring-review");
    await expect(
      page.getByRole("heading", { name: "Coloring-page review" }),
    ).toBeVisible();
    // The generated samples appear with approve/reject controls.
    await expect(
      page.getByRole("button", { name: "Approve" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Dinosaurs").first()).toBeVisible();
  });

  test("review API validates its input", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "API-only — run once");
    const bad = await request.post("/api/admin/coloring/review", {
      data: { id: "nope", action: "explode" },
    });
    expect(bad.status()).toBe(400);
    const missing = await request.post("/api/admin/coloring/review", {
      data: { id: "does-not-exist", action: "approve" },
    });
    expect(missing.status()).toBe(404);
    // Reject without a reason is refused.
    const noReason = await request.post("/api/admin/coloring/review", {
      data: { id: "dinosaurs-happy-t-rex-01", action: "reject" },
    });
    expect(noReason.status()).toBe(400);
  });
});
