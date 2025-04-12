"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Fingerprint,
  LayoutDashboard,
  UserPlus,
  Calendar,
  Users,
  BarChart3,
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = (path: string) => router.push(path);

  // Function to determine if this path is active.
  const isActive = (path: string) =>
    // You can adjust this logic depending on your routing. For example, if your route
    // is nested and you want to match only the beginning, you may use startsWith.
    pathname === path || pathname.startsWith(path);

  return (
    <div className="lg:w-64 bg-white shadow-lg lg:min-h-screen p-6">
      {/* Logo and Title */}
      <div className="flex items-center space-x-3 mb-10">
        <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
          <Fingerprint className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">InfiAtn</h1>
      </div>

      {/* Navigation Buttons */}
      <nav className="space-y-1">
        <button
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive("/") ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          onClick={() => navigateTo("/")}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </button>

        <button
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive("/form") ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          onClick={() => navigateTo("/form")}
        >
          <UserPlus className="h-5 w-5" />
          <span>Enrollment</span>
        </button>

        <button
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive("/attendance") ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          onClick={() => navigateTo("/attendance")}
        >
          <Calendar className="h-5 w-5" />
          <span>Attendance</span>
        </button>

        <button
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive("/teacher") ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          onClick={() => navigateTo("/teacher")}
        >
          <Users className="h-5 w-5" />
          <span>Add Teacher</span>
        </button>

        <button
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive("/selectsubject") ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          onClick={() => navigateTo("/selectsubject")}
        >
          <BarChart3 className="h-5 w-5" />
          <span>Subject</span>
        </button>

        <button
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive("/addteachersubject") ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          onClick={() => navigateTo("/addteachersubject")}
        >
          <BarChart3 className="h-5 w-5" />
          <span>Teacher List</span>
        </button>
      </nav>

      {/* System Status Section */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-green-500 absolute top-0 right-0 border-2 border-white"></div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Fingerprint className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Fingerprint System</p>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
