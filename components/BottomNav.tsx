"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const isActive = (path: string) => pathname === path;

  // Check for unread messages
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const userId = 'cmh503gjd00008okpn9ic7cia'; // TODO: Get from auth
        const response = await fetch(`/api/notifications/in-app?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    checkUnread();

    // Check every 10 seconds for updates (only when not on Ask page)
    const interval = setInterval(() => {
      if (pathname !== '/ask') {
        checkUnread();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pathname]);

  // Detect keyboard on Ask page
  useEffect(() => {
    if (pathname !== '/ask' || typeof window === 'undefined' || !window.visualViewport) {
      setKeyboardVisible(false);
      return;
    }

    const updateViewport = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const keyboardOpen = viewport.height < window.innerHeight - 150;
        setKeyboardVisible(keyboardOpen);
      }
    };

    setTimeout(updateViewport, 100);
    window.visualViewport.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, [pathname]);

  // Hide on Ask page when keyboard is visible
  if (pathname === '/ask' && keyboardVisible) {
    return null;
  }

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
            className={`flex flex-col items-center gap-1 transition-all min-h-[44px] min-w-[44px] justify-center relative ${
              isActive("/ask")
                ? "text-rabbit-lavender-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {/* Unread Badge */}
            {unreadCount > 0 && !isActive("/ask") && (
              <div className="absolute top-0 right-0 w-5 h-5 bg-rabbit-lavender-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-rabbit-card">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
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
