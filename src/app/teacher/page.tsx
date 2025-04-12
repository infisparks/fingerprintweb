"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { ref, push, set, get } from "firebase/database";
import { db } from "../../firebase"; // Update path according to your project structure
import {
  FaChalkboardTeacher,
  FaUser,
  FaPhone,
  FaBriefcase,
  FaAddressBook,
  FaPaperPlane,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import Sidebar from "../Component/Sidebar"; // Ensure the path is correct

// Interfaces for branch data (from subject registration)
interface Semester {
  id: number | string; // can be number from Firebase or string from our push()
  sem: string;
  subjects: string[];
}

interface BranchData {
  id: string;
  branch: string;
  semesters: Semester[];
}

// Interface for the teacher subject selection
interface TeacherSubjectSelection {
  branchId: string;
  branchName: string;
  semesterId: string;
  sem: string;
  subject: string;
}

export default function TeacherRegistration() {
  // Teacher registration fields
  const [teacherName, setTeacherName] = useState("");
  const [teacherNumber, setTeacherNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teacher subject selection state
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectSelection[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // Temporary states for subject modal selections
  const [branchList, setBranchList] = useState<BranchData[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState("");
  const [currentSemesterId, setCurrentSemesterId] = useState("");
  const [currentSubject, setCurrentSubject] = useState("");

  // When modal opens, fetch branch list from Firebase (subjects node)
  useEffect(() => {
    if (showSubjectModal) {
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
      fetchBranchList();
    }
  }, [showSubjectModal]);

  // Handler for adding a teacher subject selection
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

    setTeacherSubjects((prev) => [...prev, newSelection]);
    // Clear temporary selections for next entry
    setCurrentBranchId("");
    setCurrentSemesterId("");
    setCurrentSubject("");
  };

  // Remove a selected teacher subject
  const handleRemoveSubjectSelection = (index: number) => {
    setTeacherSubjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit teacher registration (include teacherSubjects if present)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherNumber.trim()) {
      alert("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);

    const newTeacher = {
      teacherName,
      teacherNumber,
      profession: profession || null,
      address: address || null,
      teacherSubjects: teacherSubjects.length > 0 ? teacherSubjects : null,
      createdAt: new Date().getTime(),
    };

    try {
      // Use the 'teachers' node; let Firebase generate a unique key using push()
      const teachersRef = ref(db, "teachers");
      const newTeacherRef = push(teachersRef);
      await set(newTeacherRef, newTeacher);
      alert("Teacher registered successfully!");
      // Clear form fields
      setTeacherName("");
      setTeacherNumber("");
      setProfession("");
      setAddress("");
      setTeacherSubjects([]);
    } catch (error) {
      console.error("Error registering teacher:", error);
      alert("Error registering teacher. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-100 to-blue-100">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg mb-6">
          <div className="flex items-center justify-center mb-6">
            <FaChalkboardTeacher className="h-10 w-10 text-blue-600 mr-2" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Teacher Registration
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Teacher Name Field */}
            <div>
              <label htmlFor="teacherName" className="block text-gray-700 mb-1">
                Teacher Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <span className="px-3 text-gray-500">
                  <FaUser />
                </span>
                <input
                  type="text"
                  id="teacherName"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  required
                  className="w-full p-2 focus:outline-none"
                  placeholder="Enter teacher's full name"
                />
              </div>
            </div>
            {/* Teacher Number Field */}
            <div>
              <label htmlFor="teacherNumber" className="block text-gray-700 mb-1">
                Teacher Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <span className="px-3 text-gray-500">
                  <FaPhone />
                </span>
                <input
                  type="tel"
                  id="teacherNumber"
                  value={teacherNumber}
                  onChange={(e) => setTeacherNumber(e.target.value)}
                  required
                  className="w-full p-2 focus:outline-none"
                  placeholder="Enter teacher's contact number"
                />
              </div>
            </div>
            {/* Profession Field (Optional) */}
            <div>
              <label htmlFor="profession" className="block text-gray-700 mb-1">
                Profession (Optional)
              </label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <span className="px-3 text-gray-500">
                  <FaBriefcase />
                </span>
                <input
                  type="text"
                  id="profession"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full p-2 focus:outline-none"
                  placeholder="e.g., Lecturer, Professor"
                />
              </div>
            </div>
            {/* Address Field (Optional) */}
            <div>
              <label htmlFor="address" className="block text-gray-700 mb-1">
                Address (Optional)
              </label>
              <div className="flex items-center border border-gray-300 rounded-md">
                <span className="px-3 text-gray-500">
                  <FaAddressBook />
                </span>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 focus:outline-none"
                  placeholder="Enter teacher's address"
                />
              </div>
            </div>
            {/* Optional: Select Teacher Subject Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowSubjectModal(true)}
                className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                <FaPlus className="mr-2 inline-block" /> Select Teacher Subject
              </button>
            </div>
            {/* Display selected teacher subjects */}
            {teacherSubjects.length > 0 && (
              <div className="p-4 border border-gray-200 rounded-md">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Selected Subjects:
                </h3>
                <ul className="list-disc list-inside">
                  {teacherSubjects.map((ts, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span>
                        {ts.branchName} - {ts.sem} - {ts.subject}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectSelection(index)}
                        className="text-red-500 hover:text-red-600 ml-2"
                      >
                        <FaTrash />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Submit Teacher Registration */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
            >
              <FaPaperPlane className="mr-2" />
              {isSubmitting ? "Registering..." : "Register Teacher"}
            </button>
          </form>
        </div>

        {/* Subject Selection Modal */}
        {showSubjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowSubjectModal(false)}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Select Teacher Subject
              </h2>
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
                {/* Display currently selected subjects in the modal */}
                {teacherSubjects.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Currently Selected Subjects:
                    </h3>
                    <ul className="list-disc list-inside">
                      {teacherSubjects.map((ts, index) => (
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
              <div className="mt-6 text-right">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
