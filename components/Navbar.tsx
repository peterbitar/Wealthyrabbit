import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold">
            WealthyRabbit
          </Link>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-300 transition">
              Home
            </Link>
            <Link href="/lists" className="hover:text-gray-300 transition">
              Lists
            </Link>
            <Link href="/settings" className="hover:text-gray-300 transition">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
