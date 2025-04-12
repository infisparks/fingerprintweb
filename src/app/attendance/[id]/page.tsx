"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ref, onValue, remove } from "firebase/database";
import { db } from "../../../firebase";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  User,
  XCircle,
  Trash2,
} from "lucide-react";
import Sidebar from "../../Component/Sidebar"; // Adjust path as needed

interface AttendanceRecord {
  attended: boolean;
  timestamp: number; // ms or s (we handle both)
  branch?: string;
  sem?: string;
  subject?: string;
}

interface AttendanceRecordWithKey extends AttendanceRecord {
  key: string;
}

interface UserDetail {
  id?: string | number;
  name?: string;
  number?: string;
  rollNumber?: string;
  pushKey?: string;
  branch?: string; // Must exist to match with lecturecount
  sem?: string;    // Must exist to match with lecturecount
  attendance?: { [key: string]: AttendanceRecord };
  createdAt?: number;
}

// For lecturecount data: lecturecount/{branchName}/{sem}/{subject} = { count, ... }
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

export default function UserAttendanceDetail() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [userData, setUserData] = useState<UserDetail>({});
  const [attendanceArray, setAttendanceArray] = useState<AttendanceRecordWithKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For scheduled lectures from the "lecturecount" node:
  const [lectureCountData, setLectureCountData] = useState<LectureCountData>({});

  // 1. Fetch the user's data (including attendance).
  useEffect(() => {
    if (!id) return;

    const userRef = ref(db, `users/${id}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val() as UserDetail;
        setUserData(data);

        // Convert attendance object to an array with keys, sorted by timestamp desc.
        if (data.attendance) {
          const attendanceRecords = Object.entries(data.attendance).map(([key, record]) => ({
            key,
            ...record,
          })) as AttendanceRecordWithKey[];

          const sortedAttendance = attendanceRecords.sort((a, b) => {
            const timeA = String(a.timestamp).length === 10 ? a.timestamp * 1000 : a.timestamp;
            const timeB = String(b.timestamp).length === 10 ? b.timestamp * 1000 : b.timestamp;
            return timeB - timeA;
          });
          setAttendanceArray(sortedAttendance);
        } else {
          setAttendanceArray([]);
        }
      } else {
        setUserData({});
        setAttendanceArray([]);
      }
    });

    return () => unsubscribe();
  }, [id]);

  // 2. Fetch the lecturecount data to know how many lectures are scheduled per subject.
  useEffect(() => {
    const lectureCountRef = ref(db, "lecturecount");
    const unsubscribe = onValue(lectureCountRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as LectureCountData;
        setLectureCountData(data);
      } else {
        setLectureCountData({});
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Summaries based on scheduled vs. attended
  const userBranch = userData.branch || "";
  const userSem = userData.sem || "";

  // a) Sum the total scheduled lectures for this user's branch & sem
  let totalScheduled = 0;
  if (lectureCountData[userBranch]?.[userSem]) {
    const subjectsObj = lectureCountData[userBranch][userSem];
    totalScheduled = Object.values(subjectsObj).reduce(
      (sum, entry) => sum + (entry.count || 0),
      0
    );
  }

  // b) Count how many lectures the user actually attended (out of those scheduled)
  //    We'll check the user's attendance records that match userBranch, userSem, and attended = true
  //    The user might have multiple attendance records for the same subject, but that generally means
  //    they've attended multiple lectures for that subject. We'll count them all.
  let totalAttended = 0;
  attendanceArray.forEach((record) => {
    if (record.branch === userBranch && record.sem === userSem && record.attended) {
      // This means the user was present for a lecture that presumably is part of the scheduled set
      totalAttended++;
    }
  });

  // c) Compute absent and overall attendance rate
  const totalAbsent = Math.max(totalScheduled - totalAttended, 0);
  const overallAttendanceRate =
    totalScheduled > 0 ? Math.round((totalAttended / totalScheduled) * 100) : 0;

  // 4. Subject-wise Breakdown
  const subjectMap = lectureCountData[userBranch]?.[userSem] || {};

  // Count how many times the user is present per subject
  const userSubjectAttendance: { [subject: string]: number } = {};
  attendanceArray.forEach((record) => {
    if (
      record.branch === userBranch &&
      record.sem === userSem &&
      record.attended === true &&
      record.subject
    ) {
      const subj = record.subject;
      if (!userSubjectAttendance[subj]) {
        userSubjectAttendance[subj] = 0;
      }
      userSubjectAttendance[subj]++;
    }
  });

  // Build an array for subject breakdown
  const subjectBreakdown: {
    subject: string;
    attended: number;
    scheduled: number;
    percentage: number;
  }[] = [];

  Object.keys(subjectMap).forEach((subject) => {
    const scheduled = subjectMap[subject].count || 0;
    const attended = userSubjectAttendance[subject] || 0;
    const percentage = scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0;
    subjectBreakdown.push({ subject, attended, scheduled, percentage });
  });

  // 5. Utility: Format date & time
  const formatDate = (timestamp: number) => {
    const rawTimestamp = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(rawTimestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const rawTimestamp = String(timestamp).length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(rawTimestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // 6. Group attendance records by month-year for display
  const groupedAttendance = attendanceArray.reduce((groups, record) => {
    const rawTimestamp =
      String(record.timestamp).length === 10 ? record.timestamp * 1000 : record.timestamp;
    const date = new Date(rawTimestamp);
    const monthYear = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(record);
    return groups;
  }, {} as Record<string, AttendanceRecordWithKey[]>);

  // 7. Deleting an attendance record
  const deleteAttendanceRecord = async (recordKey: string) => {
    if (!id) return;
    const confirmDelete = confirm("Are you sure you want to delete this attendance record?");
    if (!confirmDelete) return;

    const recordRef = ref(db, `users/${id}/attendance/${recordKey}`);
    try {
      await remove(recordRef);
      // The onValue listener will auto-refresh the list
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  // 8. If no ID is provided or data is still loading...
  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar Component */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 py-8 px-4">
          {/* Back Button */}
          <button
            onClick={() => router.push("/attendance")}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance Dashboard
          </button>

          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* User Profile Card */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
                  <h1 className="text-2xl font-bold text-white">Student Profile</h1>
                </div>

                <div className="p-8">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex-shrink-0 h-24 w-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 md:mb-0">
                      {userData.name?.charAt(0).toUpperCase() || "?"}
                    </div>

                    <div className="md:ml-6">
                      <h2 className="text-2xl font-bold text-gray-800">{userData.name}</h2>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center text-gray-600">
                          <User className="h-5 w-5 mr-2 text-blue-500" />
                          <span className="font-medium mr-2">ID:</span> {userData.id}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                          <span className="font-medium mr-2">Roll Number:</span>{" "}
                          {userData.rollNumber || "N/A"}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-5 w-5 mr-2 text-blue-500" />
                          <span className="font-medium mr-2">Phone:</span>{" "}
                          {userData.number || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics */}
              <div className="bg-white rounded-2xl shadow-xl mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800">Attendance Summary</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Overall attendance calculation based on total scheduled lectures for
                    {` ${userBranch} / ${userSem} `}.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  {/* Attended Lectures */}
                  <div className="p-6 text-center">
                    <div className="text-4xl font-bold text-blue-600">{totalAttended}</div>
                    <div className="mt-1 text-sm font-medium text-gray-500">Attended Lectures</div>
                  </div>

                  {/* Missed Lectures */}
                  <div className="p-6 text-center">
                    <div className="text-4xl font-bold text-red-500">{totalAbsent}</div>
                    <div className="mt-1 text-sm font-medium text-gray-500">Missed Lectures</div>
                  </div>

                  {/* Attendance Rate */}
                  <div className="p-6 text-center">
                    <div className="text-4xl font-bold text-indigo-600">
                      {overallAttendanceRate}%
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-500">
                      Attendance Rate
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${overallAttendanceRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Subject-wise Breakdown */}
              <div className="bg-white rounded-2xl shadow-xl mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800">Subject Breakdown</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Shows how many lectures were scheduled vs. how many the student attended, per subject.
                  </p>
                </div>
                {Object.keys(subjectMap).length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No subject data found for <strong>{userBranch}</strong> / <strong>{userSem}</strong>.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Attended
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Scheduled
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(subjectMap).map(([subjName, entry]) => {
                          const scheduled = entry.count || 0;
                          const attended = userSubjectAttendance[subjName] || 0;
                          const percentage =
                            scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0;

                          return (
                            <tr
                              key={subjName}
                              className="hover:bg-blue-50 transition-colors duration-150"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {subjName}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{attended}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{scheduled}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium">{percentage}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Attendance Records: Grouped by Month/Year */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800">Attendance History</h2>
                </div>

                {Object.keys(groupedAttendance).length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                      <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-gray-500 font-medium">No attendance records found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      This student has no recorded attendance data
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {Object.entries(groupedAttendance).map(([monthYear, records]) => (
                      <div key={monthYear} className="p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">{monthYear}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 text-left">
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Time
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Subject
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {records.map((record) => {
                                const rawTimestamp =
                                  String(record.timestamp).length === 10
                                    ? record.timestamp * 1000
                                    : record.timestamp;

                                return (
                                  <tr
                                    key={record.key}
                                    className="hover:bg-blue-50 transition-colors duration-150"
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                        <span className="text-sm font-medium text-gray-900">
                                          {formatDate(rawTimestamp)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                        <span className="text-sm text-gray-500">
                                          {formatTime(rawTimestamp)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {record.subject || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {record.attended ? (
                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                          <CheckCircle className="h-4 w-4 mr-1" /> Present
                                        </span>
                                      ) : (
                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                          <XCircle className="h-4 w-4 mr-1" /> Absent
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <button
                                        onClick={() => deleteAttendanceRecord(record.key)}
                                        className="flex items-center text-red-500 hover:text-red-700 transition-colors"
                                        title="Delete Record"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="ml-1 text-xs font-medium">Delete</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
