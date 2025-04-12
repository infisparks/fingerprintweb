"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { ref, get, set, remove } from "firebase/database";
import { db } from "../../firebase"; // Adjust the path as needed
import { FaEdit, FaTrash, FaTimes, FaCheck, FaPlus } from "react-icons/fa";

interface Semester {
  id: string;
  sem: string;
  subjects: string[];
}

interface BranchData {
  id: string;
  branch: string;
  semesters: Semester[];
}

const EditSubject = () => {
  const [branchList, setBranchList] = useState<BranchData[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);

  // Fetch branch list from Firebase Realtime Database
  const fetchBranches = async () => {
    try {
      const subjectsRef = ref(db, "subjects");
      const snapshot = await get(subjectsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const branchArray: BranchData[] = Object.values(data);
        setBranchList(branchArray);
      } else {
        setBranchList([]);
      }
    } catch (error) {
      console.error("Error fetching branches", error);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Close the modal
  const closeModal = () => {
    setSelectedBranch(null);
  };

  // Handle branch name change in the modal
  const handleBranchChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (selectedBranch) {
      setSelectedBranch({ ...selectedBranch, branch: e.target.value });
    }
  };

  // Handle semester name change in the modal
  const handleSemesterChange = (semesterId: string, value: string) => {
    if (selectedBranch) {
      const updatedSemesters = selectedBranch.semesters.map((sem) =>
        sem.id === semesterId ? { ...sem, sem: value } : sem
      );
      setSelectedBranch({ ...selectedBranch, semesters: updatedSemesters });
    }
  };

  // Handle subject change in the modal
  const handleSubjectChange = (
    semesterId: string,
    subjectIndex: number,
    value: string
  ) => {
    if (selectedBranch) {
      const updatedSemesters = selectedBranch.semesters.map((sem) => {
        if (sem.id === semesterId) {
          const updatedSubjects = [...sem.subjects];
          updatedSubjects[subjectIndex] = value;
          return { ...sem, subjects: updatedSubjects };
        }
        return sem;
      });
      setSelectedBranch({ ...selectedBranch, semesters: updatedSemesters });
    }
  };

  const addSemester = () => {
    if (selectedBranch) {
      const newSemester: Semester = {
        id: Date.now().toString(),
        sem: "",
        subjects: [""],
      };
      setSelectedBranch({
        ...selectedBranch,
        semesters: [...selectedBranch.semesters, newSemester],
      });
    }
  };

  const removeSemester = (semesterId: string) => {
    if (selectedBranch) {
      const updatedSemesters = selectedBranch.semesters.filter(
        (sem) => sem.id !== semesterId
      );
      setSelectedBranch({ ...selectedBranch, semesters: updatedSemesters });
    }
  };

  const addSubject = (semesterId: string) => {
    if (selectedBranch) {
      const updatedSemesters = selectedBranch.semesters.map((sem) =>
        sem.id === semesterId
          ? { ...sem, subjects: [...sem.subjects, ""] }
          : sem
      );
      setSelectedBranch({ ...selectedBranch, semesters: updatedSemesters });
    }
  };

  const removeSubject = (semesterId: string, subjectIndex: number) => {
    if (selectedBranch) {
      const updatedSemesters = selectedBranch.semesters.map((sem) => {
        if (sem.id === semesterId) {
          const updatedSubjects = sem.subjects.filter((_, idx) => idx !== subjectIndex);
          return { ...sem, subjects: updatedSubjects };
        }
        return sem;
      });
      setSelectedBranch({ ...selectedBranch, semesters: updatedSemesters });
    }
  };

  // Save the edited branch details to Firebase
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedBranch) {
      try {
        const branchRef = ref(db, `subjects/${selectedBranch.id}`);
        await set(branchRef, selectedBranch);
        alert("Branch updated successfully.");
        closeModal();
        fetchBranches();
      } catch (error) {
        console.error("Error updating branch", error);
        alert("Error updating branch");
      }
    }
  };

  // Delete the selected branch from Firebase
  const handleDeleteBranch = async () => {
    if (selectedBranch && confirm("Are you sure you want to delete this branch?")) {
      try {
        const branchRef = ref(db, `subjects/${selectedBranch.id}`);
        await remove(branchRef);
        alert("Branch deleted successfully.");
        closeModal();
        fetchBranches();
      } catch (error) {
        console.error("Error deleting branch", error);
        alert("Error deleting branch");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Branch List
        </h1>
        {branchList.length === 0 ? (
          <p className="text-center text-gray-500">No branches found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {branchList.map((branch) => (
              <div
                key={branch.id}
                className="p-4 border border-gray-200 rounded-lg shadow-sm flex justify-between items-center"
              >
                <span className="text-xl font-semibold text-gray-700">
                  {branch.branch}
                </span>
                <button
                  onClick={() => setSelectedBranch(branch)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <FaEdit size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for editing branch */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
            >
              <FaTimes size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Edit Branch
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label
                  htmlFor="branchName"
                  className="block text-gray-700 font-semibold mb-2"
                >
                  Branch Name
                </label>
                <input
                  id="branchName"
                  type="text"
                  value={selectedBranch.branch}
                  onChange={handleBranchChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-700">
                    Semesters
                  </h3>
                  <button
                    type="button"
                    onClick={addSemester}
                    className="flex items-center text-blue-500 hover:text-blue-600"
                  >
                    <FaPlus className="mr-1" /> Add Semester
                  </button>
                </div>
                {selectedBranch.semesters.length === 0 ? (
                  <p className="text-gray-500">No semesters added.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedBranch.semesters.map((sem, semIndex) => (
                      <div key={sem.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-gray-700 font-medium">
                            Semester {semIndex + 1}
                          </label>
                          <button
                            type="button"
                            onClick={() => removeSemester(sem.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <FaTrash />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={sem.sem}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleSemesterChange(sem.id, e.target.value)
                          }
                          placeholder="Enter semester name or number"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          required
                        />
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-lg font-semibold text-gray-600">
                              Subjects
                            </h4>
                            <button
                              type="button"
                              onClick={() => addSubject(sem.id)}
                              className="flex items-center text-blue-500 hover:text-blue-600"
                            >
                              <FaPlus className="mr-1" /> Add Subject
                            </button>
                          </div>
                          {sem.subjects.length === 0 ? (
                            <p className="text-gray-500">No subjects added.</p>
                          ) : (
                            <div className="space-y-2">
                              {sem.subjects.map((subject, subIndex) => (
                                <div key={subIndex} className="flex items-center space-x-3">
                                  <input
                                    type="text"
                                    value={subject}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                      handleSubjectChange(sem.id, subIndex, e.target.value)
                                    }
                                    placeholder={`Subject ${subIndex + 1}`}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSubject(sem.id, subIndex)
                                    }
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-4 mt-4">
                <button
                  type="button"
                  onClick={handleDeleteBranch}
                  className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition duration-200"
                >
                  <FaTrash className="mr-2 inline-block" /> Delete Branch
                </button>
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
  );
};

export default EditSubject; 