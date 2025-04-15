import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <main className="flex flex-grow flex-col items-center justify-center p-6 gap-8">
      <Link
        href="/play"
        className="px-8 py-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 
                   text-white dark:text-gray-100 
                   rounded-lg text-xl font-semibold transition-colors duration-200 transform hover:scale-105 shadow-lg"
      >
        Play Chess
      </Link>
    </main>
  );
}
