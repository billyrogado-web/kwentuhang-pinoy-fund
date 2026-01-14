import "./globals.css";

export const metadata = {
  title: "Kwentuhang Pinoy - Outing Fund",
  description: "Group fund tracker"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
