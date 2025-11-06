import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0f0f13]">
      <AdminSidebar />
      <main className="flex-1 lg:ml-[200px]">
        {children}
      </main>
    </div>
  );
}