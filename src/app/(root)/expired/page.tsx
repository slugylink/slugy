import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ExpiredPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          Link Expired
        </h1>
        
        <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
          This link has expired and is no longer available.
        </p>
        
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need a new link?{" "}
            <Link 
              href="/app" 
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 