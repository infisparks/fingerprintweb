"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import Link from "next/link";
import { db } from "../../firebase";
import {
  ChevronDown,
  Eye,
  Filter,
  Search,
  Users,
} from "lucide-react";
import Sidebar from "../Component/Sidebar"; // Adjust the import path based on your project structure

// Interface for an attendance record.
interface AttendanceRecord {
  attended: boolean;
  timestamp: number; // in milliseconds or seconds
  branch?: string;
  sem?: string;
  subject?: string;
}

// Interface for user data.
interface UserData {
  [key: string]: {
    id?: string | number;
    name?: string;
    number?: string;
    rollNumber?: string;
    sem?: string;    // User's semester
    branch?: string; // User's branch
    pushKey?: string;
    attendance?: { [attendanceKey: string]: AttendanceRecord };
    createdAt?: number;
  };
}

// Interface for lecture count data.
interface LectureCountEntry {
  branchName: string;
  sem: string;
  subject: string;
  count: number;
}
interface LectureCountData {
  [branchName: string]: {
    [sem: string]: {
      [subject: string]: LectureCountEntry;
    };
  };
}

export default function AttendancePage() {
  const [usersData, setUsersData] = useState<UserData>({});
  const [lectureCountData, setLectureCountData] = useState<LectureCountData>({});
  const [filter, setFilter] = useState<"all" | "year" | "month" | "week">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch users data.
  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUsersData(data);
      } else {
        setUsersData({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch lecture count data.
  useEffect(() => {
    const lectureCountRef = ref(db, "lecturecount");
    const unsubscribe = onValue(lectureCountRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLectureCountData(data);
      } else {
        setLectureCountData({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper: Check whether a given timestamp is within the selected filter.
  const isWithinFilter = (timestamp: number) => {
    const now = new Date();
    let date = new Date(timestamp);
    // If timestamp appears to be in seconds (e.g., length=10), convert it.
    if (String(timestamp).length === 10) {
      date = new Date(timestamp * 1000);
    }
    switch (filter) {
      case "year":
        return now.getFullYear() === date.getFullYear();
      case "month":
        return now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth();
      case "week": {
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = (now.getTime() - date.getTime()) / oneDay;
        return diffDays <= 7 && diffDays >= 0;
      }
      case "all":
      default:
        return true;
    }
  };

  // Transform user data into an array for easier rendering and compute attendance percentage.
  const usersArray = Object.entries(usersData).map(([key, value]) => {
    // Ensure attendance exists.
    const attendance = value.attendance || {};
    // Filter attendance records that match the user's branch and sem and the selected filter.
    const validAttendance = Object.values(attendance).filter((record) => {
      return record.branch === value.branch && record.sem === value.sem && isWithinFilter(record.timestamp);
    });
    const attendanceCount = validAttendance.length;

    // Calculate total scheduled lectures for the user's branch & sem.
    let scheduledLectures = 0;
    if (lectureCountData[value.branch || ""] && lectureCountData[value.branch || ""][value.sem || ""]) {
      const subjectEntries = lectureCountData[value.branch || ""][value.sem || ""];
      scheduledLectures = Object.values(subjectEntries).reduce((sum, entry) => sum + entry.count, 0);
    }
    const attendancePercentage = scheduledLectures > 0
      ? Math.round((attendanceCount / scheduledLectures) * 100)
      : 0;

    return {
      pushKey: key,
      id: value.id || "",
      name: value.name || "Unknown",
      number: value.number || "",
      rollNumber: value.rollNumber || "",
      sem: value.sem || "N/A",
      branch: value.branch || "N/A",
      attendanceCount,
      scheduledLectures,
      attendancePercentage,
    };
  });

  // Filter users by search term.
  const filteredUsers = usersArray.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(user.id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary statistics.
  const totalUsers = usersArray.length;
  // Average attendance percentage across users.
  const averageAttendancePercentage =
    usersArray.length > 0
      ? Math.round(usersArray.reduce((sum, user) => sum + user.attendancePercentage, 0) / usersArray.length)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 sm:px-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Attendance Dashboard</h1>
                    <p className="text-blue-100">Track and manage student attendance records</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                    <Users className="h-5 w-5 text-blue-100" />
                    <span className="text-white font-medium">{totalUsers} Students</span>
                    <span className="mx-2 text-blue-200">|</span>
                    <span className="text-white font-medium">
                      Avg: {averageAttendancePercentage}% Attendance
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter and Search Section */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white sm:px-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name or roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <label htmlFor="filter" className="text-sm font-medium text-gray-700">
                      Filter by:
                    </label>
                    <div className="relative inline-block w-full sm:w-auto">
                      <select
                        id="filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="appearance-none bg-white border border-gray-200 rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Time</option>
                        <option value="year">This Year</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                          Roll Number
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                          Semester
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                          Attendance
                        </th>
                        <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map((user) => (
                        <tr key={user.pushKey} className="hover:bg-blue-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">ID: {user.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.rollNumber || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.sem}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.branch}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="mb-1">
                                <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {user.attendanceCount} / {user.scheduledLectures} sessions
                                </span>
                              </div>
                              <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full"
                                  style={{ width: `${user.attendancePercentage}%` }}
                                ></div>
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                {user.attendancePercentage}% Attendance
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/attendance/${user.pushKey}`}
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="rounded-full bg-blue-50 p-3 mb-4">
                                <Users className="h-6 w-6 text-blue-500" />
                              </div>
                              <p className="text-gray-500 font-medium">No students found</p>
                              <p className="text-gray-400 text-sm mt-1">
                                {searchTerm
                                  ? "Try a different search term"
                                  : "No attendance records available"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-500 text-center sm:text-right">
                Showing {filteredUsers.length} of {totalUsers} students
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
