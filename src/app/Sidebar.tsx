"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut, BarChart3, PenTool, Search, ChevronDown, ChevronRight, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    generate: true, // 생성 메뉴는 기본적으로 열어둠
  });
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 초기 사용자 정보 가져오기
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // 인증 상태 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await supabase.auth.signOut();
    toast.success("로그아웃 완료", {
      description: "성공적으로 로그아웃되었습니다.",
    });
    router.push("/");
    router.refresh();
  };

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: '대시보드',
      icon: BarChart3,
      href: '/dashboard',
      isCategory: false
    },
    {
      key: 'generate',
      label: '생성',
      icon: PenTool,
      isCategory: true,
      subItems: [
        { href: '/blog', label: '블로그' },
        { href: '/sns', label: 'SNS 게시물' },
        { href: '/youtube', label: '유튜브' },
        { href: '/copywriting', label: '카피라이팅' },
        { href: '/shorts', label: '블로그 쇼츠' },
      ]
    },
    {
      key: 'seo-check',
      label: '점검',
      icon: Search,
      href: '/seo-check',
      isCategory: false
    }
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
          <Link href="/" className="block">
            <img 
              src="/logo.png" 
              alt="Mediways" 
              className="h-8 w-auto" 
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.key}>
                {item.isCategory ? (
                  // Category with submenu
                  <div>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </div>
                      {expandedMenus[item.key] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    {expandedMenus[item.key] && (
                      <ul className="ml-4 mt-1 space-y-0">
                        {item.subItems?.map((subItem) => (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`block px-4 py-2 text-sm transition-colors ${
                                pathname === subItem.href
                                  ? 'text-white bg-[#141219]'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  // Single menu item
                  <Link
                    href={item.href!}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      pathname === item.href
                        ? 'text-white bg-[#141219]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth Section */}
        <div className="px-4 py-4">
          <hr className="border-gray-600 mb-4" />
          {user ? (
            <div className="space-y-3">
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 bg-[#1e2029] hover:bg-[#252833] rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-[#4f84f5] transition-colors">마이페이지</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors text-center">
              로그인
            </Link>
          )}
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