import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * End-to-end coverage for the photo converter and the extension handoff.
 * The handoff tests exercise the real endpoints — the same path the Chrome
 * extension will use; no mock implementation exists anywhere.
 */
let photoBuffer: Buffer;

test.beforeAll(async () => {
  // A tracable test photo: black shapes on white.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <rect width="600" height="800" fill="white"/>
    <rect x="140" y="180" width="320" height="420" fill="black"/>
    <circle cx="300" cy="130" r="70" fill="black"/>
  </svg>`;
  photoBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
});

async function uploadPhoto(page: Page): Promise<void> {
  await page.getByLabel("Choose a photo").setInputFiles({
    name: "test-photo.png",
    mimeType: "image/png",
    buffer: photoBuffer,
  });
  await expect(page.getByRole("heading", { name: "Your photo" })).toBeVisible();
}

async function confirmRightsAndAdvance(page: Page): Promise<void> {
  await page
    .getByRole("checkbox", { name: /I own this image/ })
    .check();
  await page.getByRole("button", { name: "Next: crop it" }).click();
  await expect(
    page.getByRole("heading", { name: "Frame the picture" }),
  ).toBeVisible();
}

async function completeWizardFromCrop(
  page: Page,
  engine: "ai" | "local" = "ai",
): Promise<void> {
  await page.getByRole("button", { name: "Next: pick a style" }).click();
  await page.getByRole("radio", { name: /Bold & simple/ }).click();
  // Generation fires from the Style step; Adjust operates on the result.
  if (engine === "local") {
    await page
      .getByRole("button", { name: /Use Quick Outline instead/ })
      .click();
    await page.getByRole("button", { name: "Make my page" }).click();
  } else {
    await page
      .getByRole("button", { name: "Create AI Coloring Page" })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Make it look right" }),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Looks right — continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Here’s your page" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use this page" }).click();
  await expect(
    page.getByRole("heading", { name: "Your page is ready" }),
  ).toBeVisible();
}

test.describe("photo converter — upload flow", () => {
  test("hub links to the wizard; only one tool is live", async ({ page }) => {
    await page.goto("/create");
    await expect(
      page.getByRole("heading", { name: "Create your own" }),
    ).toBeVisible();
    await expect(page.getByText("Not available yet")).toHaveCount(2);
    await page.getByRole("link", { name: "Start with a photo" }).click();
    await expect(
      page.getByRole("heading", { name: "Turn a photo into a coloring page" }),
    ).toBeVisible();
  });

  test("completes all six steps via AI and downloads PNG and PDF", async ({
    page,
  }) => {
    await page.goto("/create/photo");
    await uploadPhoto(page);
    await confirmRightsAndAdvance(page);
    await completeWizardFromCrop(page, "ai");

    const pngDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    expect((await pngDownload).suggestedFilename()).toBe("coloring-page.png");

    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    expect((await pdfDownload).suggestedFilename()).toBe("coloring-page.pdf");

    await expect(page.getByRole("button", { name: "Print it" })).toBeVisible();
  });

  test("adjusting after the result enables an explicit redraw", async ({
    page,
  }) => {
    await page.goto("/create/photo");
    await uploadPhoto(page);
    await confirmRightsAndAdvance(page);
    await page.getByRole("button", { name: "Next: pick a style" }).click();
    await page.getByRole("button", { name: "Create AI Coloring Page" }).click();
    await expect(
      page.getByRole("heading", { name: "Make it look right" }),
    ).toBeVisible({ timeout: 45_000 });

    // Nothing changed yet — redraw must be disabled (a redraw costs money).
    const redraw = page.getByRole("button", { name: "Redraw with these changes" });
    await expect(redraw).toBeDisabled();

    // Move the detail slider one notch: redraw arms, and pressing it
    // regenerates and returns to the result.
    await page.getByLabel("How much detail").focus();
    await page.keyboard.press("ArrowRight");
    await expect(redraw).toBeEnabled();
    await redraw.click();
    await expect(
      page.getByRole("heading", { name: "Make it look right" }),
    ).toBeVisible({ timeout: 45_000 });
  });

  test("Quick Outline mode still completes on-device", async ({ page }) => {
    await page.goto("/create/photo");
    await uploadPhoto(page);
    await confirmRightsAndAdvance(page);
    await completeWizardFromCrop(page, "local");
    await expect(page.getByRole("button", { name: "Print it" })).toBeVisible();
  });

  test("requires the rights confirmation before advancing", async ({
    page,
  }) => {
    await page.goto("/create/photo");
    await uploadPhoto(page);
    await expect(
      page.getByRole("button", { name: "Next: crop it" }),
    ).toBeDisabled();
  });

  test("rejects an unsupported file type calmly", async ({ page }) => {
    await page.goto("/create/photo");
    await page.getByLabel("Choose a photo").setInputFiles({
      name: "animation.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a\x01\x00\x01\x00"),
    });
    await expect(
      page.getByText("That file type won’t work here"),
    ).toBeVisible();
  });

  test("survives a browser refresh mid-flow", async ({ page }) => {
    await page.goto("/create/photo");
    await uploadPhoto(page);
    await confirmRightsAndAdvance(page);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Frame the picture" }),
    ).toBeVisible();
  });
});

test.describe("extension handoff", () => {
  test("handoff token opens the wizard with the image, single-use", async ({
    page,
    request,
  }) => {
    const created = await request.post("/api/converter/handoffs", {
      multipart: {
        version: "v1",
        image: {
          name: "from-extension.png",
          mimeType: "image/png",
          buffer: photoBuffer,
        },
      },
    });
    expect(created.status()).toBe(201);
    const { token } = await created.json();

    await page.goto(`/create/photo?handoff=${token}`);
    await expect(page.getByText("Image added from Chrome")).toBeVisible();
    // The token leaves the visible URL after redemption.
    await expect
      .poll(() => page.url())
      .not.toContain("handoff");

    // Replay after the wizard already redeemed it: generic 404.
    const replay = await request.post("/api/converter/handoffs/redeem", {
      data: { version: "v1", token },
    });
    expect(replay.status()).toBe(404);
    expect((await replay.json()).error).toBe("handoff-not-found");

    // The same rights confirmation gates the flow; then Crop onward works.
    await confirmRightsAndAdvance(page);
  });

  test("an invalid token shows the calm recovery state", async ({ page }) => {
    await page.goto(`/create/photo?handoff=${"a".repeat(43)}`);
    await expect(page.getByText("This image link has expired")).toBeVisible();
  });

  test("rejects an oversized upload", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "API-only — run once");
    const response = await request.post("/api/converter/handoffs", {
      multipart: {
        version: "v1",
        image: {
          name: "big.png",
          mimeType: "image/png",
          buffer: Buffer.alloc(11 * 1024 * 1024),
        },
      },
    });
    expect(response.status()).toBe(413);
  });

  test("rejects a wrong contract version", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "API-only — run once");
    const response = await request.post("/api/converter/handoffs", {
      multipart: {
        version: "v99",
        image: {
          name: "photo.png",
          mimeType: "image/png",
          buffer: photoBuffer,
        },
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("unsupported-version");
  });
});

test.describe("converter accessibility", () => {
  test("/create has no axe violations", async ({ page }) => {
    await page.goto("/create");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the wizard (photo, style, and adjust-result steps) has no axe violations", async ({
    page,
  }) => {
    await page.goto("/create/photo");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await uploadPhoto(page);
    await confirmRightsAndAdvance(page);
    await page.getByRole("button", { name: "Next: pick a style" }).click();
    await expect(
      page.getByRole("heading", { name: "Pick a style" }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole("button", { name: "Create AI Coloring Page" }).click();
    await expect(
      page.getByRole("heading", { name: "Make it look right" }),
    ).toBeVisible({ timeout: 45_000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
