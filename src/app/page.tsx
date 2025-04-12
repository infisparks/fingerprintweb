"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Fingerprint,

  List,
  Users,
 
  Activity,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Sidebar from "./Component/Sidebar"; // Adjust the path as necessary

interface SystemStats {
  totalStudents: number;
  totalAttendance: number;
  todayAttendance: number;
  enrolledFingerprints: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats>({
    totalStudents: 0,
    totalAttendance: 0,
    todayAttendance: 0,
    enrolledFingerprints: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<"online" | "offline" | "warning">("online");
  const [recentActivity, setRecentActivity] = useState<
    Array<{ name: string; action: string; time: string }>
  >([]);

  useEffect(() => {
    // Fetch stats from Firebase
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users = Object.values(data) as any[];

        // Calculate today's date (start of day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        // Calculate stats
        let totalAttendanceCount = 0;
        let todayAttendanceCount = 0;
        let fingerprintCount = 0;

        users.forEach((user) => {
          // Count attendance records
          if (user.attendance) {
            const attendanceRecords = Object.values(user.attendance) as any[];
            totalAttendanceCount += attendanceRecords.length;

            // Count today's attendance
            attendanceRecords.forEach((record) => {
              const timestamp =
                String(record.timestamp).length === 10 ? record.timestamp * 1000 : record.timestamp;
              if (timestamp >= todayTimestamp && record.attended) {
                todayAttendanceCount++;
              }
            });
          }

          // Count enrolled fingerprints (assuming a fingerprint property exists)
          if (user.hasFingerprint || user.fingerprintEnrolled) {
            fingerprintCount++;
          }
        });

        // Generate mock recent activity (in a real app, you'd fetch this from your database)
        const mockActivity = users.slice(0, 5).map((user, index) => {
          const actions = ["marked attendance", "enrolled fingerprint", "updated profile"];
          const times = ["2 minutes ago", "10 minutes ago", "25 minutes ago", "1 hour ago", "2 hours ago"];

          return {
            name: user.name || `Student ${index + 1}`,
            action: actions[Math.floor(Math.random() * actions.length)],
            time: times[index],
          };
        });

        setStats({
          totalStudents: users.length,
          totalAttendance: totalAttendanceCount,
          todayAttendance: todayAttendanceCount,
          enrolledFingerprints: fingerprintCount,
        });

        setRecentActivity(mockActivity);
        setSystemStatus(Math.random() > 0.8 ? "warning" : "online"); // Random status for demo
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex flex-col lg:flex-row">
        {/* Render the Sidebar component */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">
              Attendance Dashboard
            </h1>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Total</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.totalStudents}</h3>
                  <p className="text-sm text-gray-500 mt-1">Registered Students</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <Fingerprint className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Enrolled</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {stats.enrolledFingerprints}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Fingerprints</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-indigo-100 rounded-lg p-3">
                      <Calendar className="h-6 w-6 text-indigo-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Today</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.todayAttendance}</h3>
                  <p className="text-sm text-gray-500 mt-1">Attendance Today</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-100 rounded-lg p-3">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Total</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.totalAttendance}</h3>
                  <p className="text-sm text-gray-500 mt-1">Attendance Records</p>
                </div>
              </div>

              {/* Quick Actions and Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                    <h2 className="text-lg font-bold text-white">Quick Actions</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <button
                      onClick={() => navigateTo("/form")}
                      className="w-full flex items-center justify-between p-6 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="bg-blue-100 rounded-lg p-3 mr-4">
                          <Fingerprint className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-800">Fingerprint Enrollment</h3>
                          <p className="text-sm text-gray-500">Register new fingerprints</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    <button
                      onClick={() => navigateTo("/attendance")}
                      className="w-full flex items-center justify-between p-6 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="bg-green-100 rounded-lg p-3 mr-4">
                          <List className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-800">Attendance Records</h3>
                          <p className="text-sm text-gray-500">View and manage attendance</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>

                    <button className="w-full flex items-center justify-between p-6 hover:bg-blue-50 transition-colors">
                      <div className="flex items-center">
                        <div className="bg-purple-100 rounded-lg p-3 mr-4">
                          <BarChart3 className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-800">Generate Reports</h3>
                          <p className="text-sm text-gray-500">Create attendance reports</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                    <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center p-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                            <Activity className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {activity.name}{" "}
                              <span className="font-normal text-gray-500">
                                {activity.action}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500">No recent activity</div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">System Status</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                          systemStatus === "online"
                            ? "bg-green-100"
                            : systemStatus === "warning"
                            ? "bg-yellow-100"
                            : "bg-red-100"
                        }`}
                      >
                        {systemStatus === "online" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : systemStatus === "warning" ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Fingerprint Scanner
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            systemStatus === "online"
                              ? "text-green-600"
                              : systemStatus === "warning"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {systemStatus === "online"
                            ? "Online"
                            : systemStatus === "warning"
                            ? "Needs Attention"
                            : "Offline"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Database</p>
                        <p className="text-xs text-green-600 mt-1">Connected</p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">API Services</p>
                        <p className="text-xs text-green-600 mt-1">Operational</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
