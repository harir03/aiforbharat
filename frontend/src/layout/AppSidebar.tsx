"use client";
import React, { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
};

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const navItems: NavItem[] = [
  {
    name: "UBID Lookup",
    icon: <SearchIcon />,
    path: "/",
  },
  {
    name: "Reviewer Queue",
    icon: <ClipboardIcon />,
    path: "/reviewer",
  },
  {
    name: "Analytics",
    icon: <ChartIcon />,
    path: "/analytics",
  },
  {
    name: "Audit Log",
    icon: <ShieldIcon />,
    path: "/audit",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      return pathname.startsWith(path);
    },
    [pathname]
  );

  // Fetch queue count for badge (uses mock fallback if API is down)
  const [queueCount, setQueueCount] = React.useState<number | null>(null);
  const [isDemo, setIsDemo] = React.useState(false);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API_URL}/api/reviewer/queue?page=1&page_size=1`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.total != null) setQueueCount(data.total);
      })
      .catch(() => {
        // API unreachable — show mock badge count and demo indicator
        setQueueCount(5);
        setIsDemo(true);
      });
  }, []);

  const showLabels = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo / Branding */}
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" className="flex items-center gap-3">
          {/* Teal logo mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1E4D58]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5Z" />
              <path d="m2 17 10 5 10-5" />
              <path d="m2 12 10 5 10-5" />
            </svg>
          </div>
          {showLabels && (
            <div className="flex flex-col">
              <span
                className="text-[15px] font-semibold text-gray-900 dark:text-white"
                style={{ letterSpacing: "-0.32px" }}
              >
                UBID Platform
              </span>
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                Karnataka Commerce &amp; Industry
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-1.5">
            <h2
              className={`mb-3 text-[11px] uppercase font-medium tracking-wider flex leading-[20px] text-gray-400 ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
              }`}
            >
              {showLabels ? "Navigation" : "•••"}
            </h2>

            <ul className="flex flex-col gap-1">
              {navItems.map((nav) => (
                <li key={nav.name}>
                  <Link
                    href={nav.path}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isActive(nav.path)
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/[0.12] dark:text-brand-300"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                    } ${
                      !isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "lg:justify-start"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        isActive(nav.path)
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                      }`}
                    >
                      {nav.icon}
                    </span>
                    {showLabels && (
                      <span className="flex-1">{nav.name}</span>
                    )}
                    {/* Queue count badge for Reviewer */}
                    {showLabels &&
                      nav.path === "/reviewer" &&
                      queueCount != null &&
                      queueCount > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2E6D7A] px-1.5 text-[11px] font-semibold text-white">
                          {queueCount > 99 ? "99+" : queueCount}
                        </span>
                      )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Bottom environment indicator */}
        {showLabels && (
          <div className="mt-auto mb-6 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isDemo ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {isDemo ? "Demo Mode" : "API Connected"}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              UBID Intelligence v2.0
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
