"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-rabbit-card border-t border-rabbit-border z-50">
      <div className="max-w-lg mx-auto px-2 py-2 sm:px-4">
        <div className="flex justify-around items-center">
          {/* Portfolio */}
          <Link
            href="/portfolio"
            className={`flex flex-col items-center gap-1 transition-all min-h-[44px] min-w-[44px] justify-center ${
              isActive("/portfolio")
                ? "text-rabbit-mint-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive("/portfolio") ? 2.5 : 2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span className="text-xs font-medium">Portfolio</span>
            {isActive("/portfolio") && (
              <div className="w-1 h-1 bg-rabbit-mint-400 rounded-full animate-breathe" />
            )}
          </Link>

          {/* Discover */}
          <Link
            href="/discover"
            className={`flex flex-col items-center gap-1 transition-all min-h-[44px] min-w-[44px] justify-center ${
              isActive("/discover")
                ? "text-rabbit-mint-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive("/discover") ? 2.5 : 2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-xs font-medium">Discover</span>
            {isActive("/discover") && (
              <div className="w-1 h-1 bg-rabbit-mint-400 rounded-full animate-breathe" />
            )}
          </Link>

          {/* Ask */}
          <Link
            href="/ask"
            className={`flex flex-col items-center gap-1 transition-all min-h-[44px] min-w-[44px] justify-center ${
              isActive("/ask")
                ? "text-rabbit-lavender-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive("/ask") ? 2.5 : 2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs font-medium">Ask</span>
            {isActive("/ask") && (
              <div className="w-1 h-1 bg-rabbit-lavender-400 rounded-full animate-breathe" />
            )}
          </Link>

          {/* Manage */}
          <Link
            href="/manage"
            className={`flex flex-col items-center gap-1 transition-all min-h-[44px] min-w-[44px] justify-center ${
              isActive("/manage")
                ? "text-rabbit-mint-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isActive("/manage") ? 2.5 : 2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <span className="text-xs font-medium">Manage</span>
            {isActive("/manage") && (
              <div className="w-1 h-1 bg-rabbit-mint-400 rounded-full animate-breathe" />
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
