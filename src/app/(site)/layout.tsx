import { Footer } from "@/shared/footer";
import { Header } from "@/shared/header";

/**
 * Layout for all public routes: the same header and footer everywhere.
 * The print-preview route and the admin shell live outside this group.
 */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
