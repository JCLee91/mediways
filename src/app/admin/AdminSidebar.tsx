"use client";

import { useState } from "react";
import { Menu, X, Home, Users, FileText, LogOut, BarChart3 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Hide sidebar entirely on admin login page
  if (pathname === '/admin/login') {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const menuItems = [
    { href: "/admin", label: "대시보드", icon: Home },
    { href: "/admin/users", label: "사용자 관리", icon: Users },
    { href: "/admin/analytics", label: "통계 분석", icon: BarChart3 },
    { href: "/admin/logs", label: "콘텐츠 로그", icon: FileText },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-[60] p-2 rounded-lg bg-gray-800/50 text-white"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar fixed left-0 top-0 h-full w-[200px] flex flex-col z-50 transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-normal text-white">Admin</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4">
          <ul className="space-y-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-lg ${
                      pathname === item.href 
                        ? 'text-white bg-gray-800/50' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout - show only when authenticated (defensive UX) */}
        <div className="px-4 py-4">
          <hr className="border-gray-600 mb-4" />
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}