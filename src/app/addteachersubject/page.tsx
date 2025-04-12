"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "../../firebase"; // Adjust path as needed
import {
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheck,
  FaPlus,

} from "react-icons/fa";
import Sidebar from "../Component/Sidebar"; // Ensure this path is correct

// --- Type Definitions ---

// Represents a semester as stored with the branch.
interface Semester {
  id: number | string; // may be number from Firebase or string from our push()
  sem: string;
  subjects: string[];
}

// Represents the branch data (from your subjects registration)
interface BranchData {
  id: string;
  branch: string;
  semesters: Semester[];
}

// Represents a teacher's subject selection.
interface TeacherSubjectSelection {
  branchId: string;
  branchName: string;
  semesterId: string;
  sem: string;
  subject: string;
}

// Represents a teacher record in Firebase.
interface TeacherData {
  id: string;
  teacherName: string;
  teacherNumber: string;
  profession?: string | null;
  address?: string | null;
  teacherSubjects?: TeacherSubjectSelection[] | null;
  createdAt?: number;
}

export default function AddTeacherSubject() {
  // State for list of teachers.
  const [teacherList, setTeacherList] = useState<TeacherData[]>([]);
  // When a teacher is chosen for subject update.
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  // List of branches loaded from "subjects" node in Firebase.
  const [branchList, setBranchList] = useState<BranchData[]>([]);

  // Temporary states to drive the subject-selection modal.
  const [currentBranchId, setCurrentBranchId] = useState("");
  const [currentSemesterId, setCurrentSemesterId] = useState("");
  const [currentSubject, setCurrentSubject] = useState("");
  // Temporary teacher subjects for the modal (may start empty or from existing teacher record).
  const [tempTeacherSubjects, setTempTeacherSubjects] = useState<TeacherSubjectSelection[]>([]);

  // Fetch teacher list from Firebase.
  const fetchTeachers = async () => {
    try {
      const teachersRef = ref(db, "teachers");
      const snapshot = await get(teachersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Rebuild teacher list while preserving each teacher's key in the record.
        const teachers: TeacherData[] = Object.entries(data).map(([key, value]) => ({
          ...(value as TeacherData),
          id: key,
        }));
        setTeacherList(teachers);
      } else {
        setTeacherList([]);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Fetch branch list from Firebase ("subjects" node).
  const fetchBranchList = async () => {
    try {
      const subjectsRef = ref(db, "subjects");
      const snapshot = await get(subjectsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const branches: BranchData[] = Object.values(data);
        setBranchList(branches);
      } else {
        setBranchList([]);
      }
    } catch (error) {
      console.error("Error fetching branch list:", error);
    }
  };

  // Open subject selection modal for a teacher.
  const openSubjectModal = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setTempTeacherSubjects(teacher.teacherSubjects ? teacher.teacherSubjects : []);
    fetchBranchList();
    // Clear current selections
    setCurrentBranchId("");
    setCurrentSemesterId("");
    setCurrentSubject("");
  };

  const closeModal = () => {
    setSelectedTeacher(null);
    setCurrentBranchId("");
    setCurrentSemesterId("");
    setCurrentSubject("");
    setTempTeacherSubjects([]);
  };

  // Handler for adding a subject selection within the modal.
  const handleAddSubjectSelection = () => {
    if (!currentBranchId || !currentSemesterId || !currentSubject) {
      alert("Please select branch, semester, and subject.");
      return;
    }
    const selectedBranch = branchList.find((b) => b.id === currentBranchId);
    if (!selectedBranch) {
      alert("Selected branch not found.");
      return;
    }
    const selectedSem = selectedBranch.semesters.find(
      (s) => s.id.toString() === currentSemesterId
    );
    if (!selectedSem) {
      alert("Selected semester not found.");
      return;
    }
    const newSelection: TeacherSubjectSelection = {
      branchId: currentBranchId,
      branchName: selectedBranch.branch,
      semesterId: currentSemesterId,
      sem: selectedSem.sem,
      subject: currentSubject,
    };
    setTempTeacherSubjects((prev) => [...prev, newSelection]);
    // Reset current selections.
    setCurrentBranchId("");
    setCurrentSemesterId("");
    setCurrentSubject("");
  };

  const handleRemoveSubjectSelection = (index: number) => {
    setTempTeacherSubjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save the updated teacher subjects to Firebase.
  const handleSaveTeacherSubjects = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      const teacherRef = ref(db, `teachers/${selectedTeacher.id}`);
      // Use set with spreading selectedTeacher to update teacherSubjects.
      await set(teacherRef, { ...selectedTeacher, teacherSubjects: tempTeacherSubjects });
      alert("Teacher subjects updated successfully.");
      closeModal();
      fetchTeachers();
    } catch (error) {
      console.error("Error updating teacher subjects:", error);
      alert("Error updating teacher subjects.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gradient-to-br from-gray-100 to-blue-100">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Add Teacher Subject
          </h1>
          {teacherList.length === 0 ? (
            <p className="text-center text-gray-500">No teachers found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {teacherList.map((teacher) => (
                <div
                  key={teacher.id}
                  className="p-4 border border-gray-200 rounded-lg shadow-sm flex justify-between items-center"
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      {teacher.teacherName}
                    </p>
                    <p className="text-sm text-gray-500">{teacher.teacherNumber}</p>
                  </div>
                  <button
                    onClick={() => openSubjectModal(teacher)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <FaEdit size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal for adding/editing teacher subjects */}
        {selectedTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              >
                <FaTimes size={24} />
              </button>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {selectedTeacher.teacherName} – Add/Edit Subjects
              </h2>
              <form onSubmit={handleSaveTeacherSubjects} className="space-y-4">
                <div className="space-y-4">
                  {/* Branch Dropdown */}
                  <div>
                    <label className="block text-gray-700 mb-1">Branch</label>
                    <select
                      value={currentBranchId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                        setCurrentBranchId(e.target.value);
                        setCurrentSemesterId("");
                        setCurrentSubject("");
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none"
                    >
                      <option value="">Select Branch</option>
                      {branchList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Semester Dropdown */}
                  {currentBranchId && (
                    <div>
                      <label className="block text-gray-700 mb-1">Semester</label>
                      <select
                        value={currentSemesterId}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                          setCurrentSemesterId(e.target.value);
                          setCurrentSubject("");
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none"
                      >
                        <option value="">Select Semester</option>
                        {branchList
                          .find((b) => b.id === currentBranchId)
                          ?.semesters.map((sem) => (
                            <option key={sem.id} value={sem.id.toString()}>
                              {sem.sem}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {/* Subject Dropdown */}
                  {currentSemesterId && (
                    <div>
                      <label className="block text-gray-700 mb-1">Subject</label>
                      <select
                        value={currentSubject}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setCurrentSubject(e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none"
                      >
                        <option value="">Select Subject</option>
                        {branchList
                          .find((b) => b.id === currentBranchId)
                          ?.semesters.find((s) => s.id.toString() === currentSemesterId)
                          ?.subjects.map((sub, idx) => (
                            <option key={idx} value={sub}>
                              {sub}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {/* Add Subject Button */}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleAddSubjectSelection}
                      className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
                    >
                      <FaPlus className="mr-2 inline-block" /> Add Subject
                    </button>
                  </div>
                  {/* Display currently selected subjects */}
                  {tempTeacherSubjects.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Currently Selected Subjects:
                      </h3>
                      <ul className="list-disc list-inside">
                        {tempTeacherSubjects.map((ts, index) => (
                          <li key={index} className="flex items-center justify-between">
                            <span>
                              {ts.branchName} - {ts.sem} - {ts.subject}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubjectSelection(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <FaTrash />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-4 mt-4">
                  <button
                    type="submit"
                    className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200"
                  >
                    <FaCheck className="mr-2 inline-block" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
