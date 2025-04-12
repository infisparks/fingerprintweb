"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { ref, set, push } from "firebase/database";
import { db } from "../../firebase"; // Adjust the path as needed
import { FaPlus, FaTrash, FaPaperPlane } from "react-icons/fa";

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

const SubjectRegistration = () => {
  const [branch, setBranch] = useState<string>("");
  const [semesters, setSemesters] = useState<Semester[]>([]);

  // Adds a new semester with a blank subject field.
  const addSemester = () => {
    const newSemester: Semester = {
      id: Date.now().toString(),
      sem: "",
      subjects: [""],
    };
    setSemesters((prev) => [...prev, newSemester]);
  };

  const removeSemester = (id: string) => {
    setSemesters((prev) => prev.filter((semester) => semester.id !== id));
  };

  const handleSemesterChange = (id: string, value: string) => {
    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === id ? { ...semester, sem: value } : semester
      )
    );
  };

  const addSubject = (semesterId: string) => {
    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === semesterId
          ? { ...semester, subjects: [...semester.subjects, ""] }
          : semester
      )
    );
  };

  const removeSubject = (semesterId: string, subIndex: number) => {
    setSemesters((prev) =>
      prev.map((semester) => {
        if (semester.id === semesterId) {
          const updatedSubjects = semester.subjects.filter(
            (_, idx) => idx !== subIndex
          );
          return { ...semester, subjects: updatedSubjects };
        }
        return semester;
      })
    );
  };

  const handleSubjectChange = (
    semesterId: string,
    subIndex: number,
    value: string
  ) => {
    setSemesters((prev) =>
      prev.map((semester) => {
        if (semester.id === semesterId) {
          const updatedSubjects = [...semester.subjects];
          updatedSubjects[subIndex] = value;
          return { ...semester, subjects: updatedSubjects };
        }
        return semester;
      })
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!branch) {
      alert("Please enter a branch name.");
      return;
    }

    const branchData: BranchData = {
      id: "",
      branch,
      semesters,
    };

    try {
      // Use push() to create a unique entry under "subjects"
      const branchRef = push(ref(db, "subjects"));
      branchData.id = branchRef.key!;
      await set(branchRef, branchData);
      alert("Subject registration saved successfully.");
      // Reset the form
      setBranch("");
      setSemesters([]);
    } catch (error) {
      console.error("Error saving data", error);
      alert("Error saving subject registration, please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Subject Registration
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch Input */}
          <div>
            <label
              htmlFor="branch"
              className="block text-gray-700 font-semibold mb-2"
            >
              Branch Name
            </label>
            <input
              id="branch"
              type="text"
              value={branch}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setBranch(e.target.value)
              }
              placeholder="Enter branch name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Semesters Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-700">
                Semesters
              </h2>
              <button
                type="button"
                onClick={addSemester}
                className="flex items-center text-blue-500 hover:text-blue-600"
              >
                <FaPlus className="mr-2" /> Add Semester
              </button>
            </div>
            {semesters.length === 0 ? (
              <p className="text-gray-500">No semesters added yet.</p>
            ) : (
              <div className="space-y-6">
                {semesters.map((semester, semIndex) => (
                  <div
                    key={semester.id}
                    className="p-4 border border-gray-200 rounded-lg shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-gray-700 font-medium">
                        Semester {semIndex + 1}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSemester(semester.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    <div className="mb-4">
                      <input
                        type="text"
                        value={semester.sem}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleSemesterChange(semester.id, e.target.value)
                        }
                        placeholder="Enter semester name or number"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-600">
                          Subjects
                        </h3>
                        <button
                          type="button"
                          onClick={() => addSubject(semester.id)}
                          className="flex items-center text-blue-500 hover:text-blue-600"
                        >
                          <FaPlus className="mr-1" /> Add Subject
                        </button>
                      </div>
                      {semester.subjects.length === 0 ? (
                        <p className="text-gray-500">
                          No subjects added for this semester.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {semester.subjects.map((subject, subIndex) => (
                            <div
                              key={subIndex}
                              className="flex items-center space-x-3"
                            >
                              <input
                                type="text"
                                value={subject}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                  handleSubjectChange(
                                    semester.id,
                                    subIndex,
                                    e.target.value
                                  )
                                }
                                placeholder={`Subject ${subIndex + 1}`}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeSubject(semester.id, subIndex)
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

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-600 transition duration-200"
            >
              <FaPaperPlane className="mr-2 inline-block" /> Submit Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectRegistration;
