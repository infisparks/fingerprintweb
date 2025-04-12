"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ref, get, set, onValue } from "firebase/database";
import { db } from "../../firebase"; // Adjust path as needed
import { FaSearch, FaCheckCircle } from "react-icons/fa";
import Sidebar from "../Component/Sidebar"; // Ensure Sidebar is correctly imported

// --- Data Type Definitions ---

// Data type for each semester in a branch.
interface Semester {
  id: number | string;
  sem: string;
  subjects: string[];
}

// Data type for a branch from the "subjects" node.
interface BranchData {
  id: string;
  branch: string;
  semesters: Semester[];
}

// Data type for teacher subject assignment (as stored in teacherRecords).
interface TeacherSubjectSelection {
  branchId: string;
  branchName: string;
  semesterId: string;
  sem: string;
  subject: string;
}

// Data type for a teacher record.
interface TeacherData {
  id: string;
  teacherName: string;
  teacherNumber: string;
  teacherSubjects?: TeacherSubjectSelection[] | null;
}

// Data type for a flat subject row in the list.
export interface SubjectRow {
  branchId: string;
  branchName: string;
  semesterId: string;
  sem: string;
  subject: string;
  teacherNames: string[];
}

// Interface for the current attendance data stored in Firebase.
// Structure: currentattendance/{branchName}/{sem} = SubjectRow
interface CurrentAttendance {
  [branchName: string]: {
    [sem: string]: SubjectRow;
  };
}

// New interface for a lecture counter entry (without date).
interface LectureCounterEntry {
  branchName: string;
  sem: string;
  subject: string;
  count: number;
}

// --- Main Component ---
export default function SubjectList() {
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentAttendance, setCurrentAttendance] = useState<CurrentAttendance>({});
  const [lectureCounters, setLectureCounters] = useState<LectureCounterEntry[]>([]);

  const router = useRouter();

  // Fetch subjects and teacher assignments.
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get branch data from "subjects".
        const subjectsRef = ref(db, "subjects");
        const subjectSnap = await get(subjectsRef);
        let branches: BranchData[] = [];
        if (subjectSnap.exists()) {
          const data = subjectSnap.val();
          branches = Object.values(data);
        }
        // Get teacher records from "teachers".
        const teachersRef = ref(db, "teachers");
        const teacherSnap = await get(teachersRef);
        let teachers: TeacherData[] = [];
        if (teacherSnap.exists()) {
          const tData = teacherSnap.val();
          teachers = Object.entries(tData).map(([key, value]) => ({
            ...(value as TeacherData),
            id: key,
          }));
        }
        // Build a flat list of subject rows.
        const rows: SubjectRow[] = [];
        branches.forEach((branch) => {
          branch.semesters.forEach((sem: Semester) => {
            sem.subjects.forEach((subject: string) => {
              // Collect teacher names assigned to this subject.
              const teacherNames: string[] = [];
              teachers.forEach((teacher) => {
                if (teacher.teacherSubjects) {
                  teacher.teacherSubjects.forEach((ts) => {
                    if (
                      ts.branchId === branch.id &&
                      ts.semesterId.toString() === sem.id.toString() &&
                      ts.subject === subject
                    ) {
                      teacherNames.push(teacher.teacherName);
                    }
                  });
                }
              });
              rows.push({
                branchId: branch.id,
                branchName: branch.branch,
                semesterId: sem.id.toString(),
                sem: sem.sem,
                subject,
                teacherNames,
              });
            });
          });
        });
        setSubjectRows(rows);
      } catch (error) {
        console.error("Error fetching subject list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Listen for changes in current attendance.
  useEffect(() => {
    const currentRef = ref(db, "currentattendance");
    const unsubscribe = onValue(currentRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentAttendance(snapshot.val());
      } else {
        setCurrentAttendance({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for changes in lecture counter node.
  useEffect(() => {
    const lectureCountRef = ref(db, "lecturecount");
    const unsubscribe = onValue(lectureCountRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const counters: LectureCounterEntry[] = [];
        // Structure: lecturecount/{branchName}/{sem}/{subject} = { count, branchName, sem, subject }
        Object.entries(data).forEach(([branchName, sems]) => {
          Object.entries(sems as object).forEach(([sem, subjects]) => {
            Object.entries(subjects as object).forEach(([subject, counterData]) => {
              counters.push({
                branchName,
                sem,
                subject,
                count: (counterData as any).count || 0,
              });
            });
          });
        });
        setLectureCounters(counters);
      } else {
        setLectureCounters([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter subject rows based on the search query.
  const filteredRows = subjectRows.filter((row) => {
    const query = searchQuery.toLowerCase();
    return (
      row.subject.toLowerCase().includes(query) ||
      row.branchName.toLowerCase().includes(query) ||
      row.sem.toLowerCase().includes(query)
    );
  });

  // Handler to set current attendance for a subject and initialize its lecture counter.
  const handleSetCurrentAttendance = async (row: SubjectRow) => {
    try {
      // Update current attendance.
      const semRef = ref(db, `currentattendance/${row.branchName}/${row.sem}`);
      await set(semRef, row);
      // Initialize the lecture counter if not exists.
      const exists = lectureCounters.some(
        (entry) =>
          entry.branchName === row.branchName &&
          entry.sem === row.sem &&
          entry.subject === row.subject
      );
      if (!exists) {
        const newCounter: LectureCounterEntry = {
          branchName: row.branchName,
          sem: row.sem,
          subject: row.subject,
          count: 0,
        };
        const counterRef = ref(
          db,
          `lecturecount/${row.branchName}/${row.sem}/${row.subject}`
        );
        await set(counterRef, newCounter);
        // The onValue listener will update lectureCounters.
      }
    } catch (error) {
      console.error("Error setting current attendance:", error);
      alert("Error setting current attendance.");
    }
  };

  // Helper to update a counter's count based on its unique keys.
  const updateCounterCount = (
    counterToUpdate: LectureCounterEntry,
    newCount: number
  ) => {
    setLectureCounters((prev) =>
      prev.map((c) =>
        c.branchName === counterToUpdate.branchName &&
        c.sem === counterToUpdate.sem &&
        c.subject === counterToUpdate.subject
          ? { ...c, count: newCount }
          : c
      )
    );
  };

  // Increase lecture count for a given counter.
  const handleIncrement = (counter: LectureCounterEntry) => {
    updateCounterCount(counter, counter.count + 1);
  };

  // Decrease lecture count for a given counter.
  const handleDecrement = (counter: LectureCounterEntry) => {
    if (counter.count > 0) {
      updateCounterCount(counter, counter.count - 1);
    }
  };

  // Save the updated lecture counter to Firebase.
  const handleSaveLectureCount = async (counter: LectureCounterEntry) => {
    try {
      const counterRef = ref(
        db,
        `lecturecount/${counter.branchName}/${counter.sem}/${counter.subject}`
      );
      await set(counterRef, counter);
    } catch (error) {
      console.error("Error saving lecture count:", error);
      alert("Error saving lecture count.");
    }
  };

  // Compute the active lecture counter(s) based on current attendance.
  const activeLectureCounters = lectureCounters.filter((counter) => {
    const activeSub = currentAttendance[counter.branchName]?.[counter.sem];
    return activeSub && activeSub.subject === counter.subject;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-6 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Top Buttons for Navigation */}
        <div className="flex justify-end space-x-4 mb-6">
          <button
            onClick={() => router.push("/editsubject")}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            Edit Subject
          </button>
          <button
            onClick={() => router.push("/subject")}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            Add Subject
          </button>
        </div>

        {/* Subject List Header */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Subject List
        </h1>

        {/* Search Input */}
        <div className="mb-6 flex items-center">
          <FaSearch className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search subject, branch, or semester..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none"
          />
        </div>

        {/* Subject List Table */}
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-center text-gray-500">No subjects found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Branch
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Semester
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Subject
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Teacher(s)
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row, idx) => {
                  const activeSubjectForSem =
                    currentAttendance[row.branchName]?.[row.sem];
                  const isActive =
                    activeSubjectForSem &&
                    activeSubjectForSem.subject === row.subject;
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {row.branchName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {row.sem}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {row.subject}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {row.teacherNames.length > 0
                          ? row.teacherNames.join(", ")
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {isActive ? (
                          <button
                            disabled
                            className="bg-green-500 text-white font-semibold py-1 px-3 rounded-md flex items-center cursor-not-allowed"
                          >
                            <FaCheckCircle className="mr-2" /> Active
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetCurrentAttendance(row)}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md transition duration-200 flex items-center"
                          >
                            <FaCheckCircle className="mr-2" /> Set Current Attendance
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Active Lecture Counter Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Active Lecture Counter
          </h2>
          {activeLectureCounters.length === 0 ? (
            <p className="text-gray-600">
              No active lecture counter. Please set current attendance.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Branch
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Semester
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Subject
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Lecture Count
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeLectureCounters.map((counter) => (
                    <tr
                      key={`${counter.branchName}-${counter.sem}-${counter.subject}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {counter.branchName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {counter.sem}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {counter.subject}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {counter.count}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        <button
                          onClick={() => handleDecrement(counter)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-1 px-3 rounded-l"
                        >
                          –
                        </button>
                        <button
                          onClick={() => handleIncrement(counter)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-1 px-3 rounded-r"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleSaveLectureCount(counter)}
                          className="ml-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
