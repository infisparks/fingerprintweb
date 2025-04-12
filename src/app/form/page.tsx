"use client";

import { useState, useEffect } from "react";
import { ref, set, get, remove } from "firebase/database";
import { db } from "../../firebase"; // Adjust the path as needed
import {
  FaUser,
  FaPhone,
  FaIdBadge,
  FaFingerprint,
  FaPaperPlane,
  FaTrash,
} from "react-icons/fa";
import Sidebar from "../Component/Sidebar"; // Adjust the path as needed

// Define a type for branch data as stored under "subjects"
interface BranchData {
  branchId: string;
  branchName: string; // Branch name to be saved
  semesters: Array<{ id: string | number; sem: string; subjects?: string[] }>;
}

const Form = () => {
  // Existing fields
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [userId, setUserId] = useState(""); // Used when selecting an ID from dropdown before saving
  const [existingUserData, setExistingUserData] = useState<any>(null);
  const [availableIds, setAvailableIds] = useState<string[]>([]);

  // New fields: branch and semester
  // availableBranches is an array of BranchData objects fetched from "subjects" node.
  const [branch, setBranch] = useState(""); // This holds the branchId from the dropdown
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [sem, setSem] = useState("");
  const [availableBranches, setAvailableBranches] = useState<BranchData[]>([]);
  const [availableSems, setAvailableSems] = useState<
    Array<{ id: string | number; sem: string; subjects?: string[] }>
  >([]);

  // Fetch used IDs from the "fingerprints" node
  useEffect(() => {
    const fetchUsedIds = async () => {
      try {
        const fingerprintsRef = ref(db, "fingerprints");
        const snapshot = await get(fingerprintsRef);
        let usedIds: string[] = [];
        if (snapshot.exists()) {
          // The keys in "fingerprints" denote numeric IDs already taken
          usedIds = Object.keys(snapshot.val());
        }
        const ids: string[] = [];
        for (let i = 1; i <= 127; i++) {
          const idStr = String(i);
          if (!usedIds.includes(idStr)) {
            ids.push(idStr);
          }
        }
        setAvailableIds(ids);
      } catch (error) {
        console.error("Error fetching fingerprints:", error);
      }
    };

    fetchUsedIds();
  }, []);

  // On component mount, check if data exists in the "id" node
  useEffect(() => {
    const fetchIdNode = async () => {
      try {
        const idRef = ref(db, "id");
        const snapshot = await get(idRef);
        if (snapshot.exists()) {
          setExistingUserData(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching id node:", error);
      }
    };

    fetchIdNode();
  }, []);

  // Fetch branch and semester options from the "subjects" node
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsRef = ref(db, "subjects");
        const snapshot = await get(subjectsRef);
        if (snapshot.exists()) {
          // Convert the subjects object into an array of BranchData objects
          const subjectsData = snapshot.val();
          const branchesArray: BranchData[] = Object.keys(subjectsData).map((branchId) => ({
            branchId,
            branchName: subjectsData[branchId].branch, // This field contains the branch name
            semesters: subjectsData[branchId].semesters || [],
          }));
          setAvailableBranches(branchesArray);
        } else {
          setAvailableBranches([]);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, []);

  // When the branch selection changes, update the available semesters
  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBranchId = e.target.value;
    setBranch(selectedBranchId);
    // Find the corresponding branch object from availableBranches
    const branchObj = availableBranches.find((b) => b.branchId === selectedBranchId);
    if (branchObj) {
      setSelectedBranch(branchObj);
      setAvailableSems(branchObj.semesters || []);
    } else {
      setSelectedBranch(null);
      setAvailableSems([]);
    }
    // Reset semester field when branch changes.
    setSem("");
  };

  // Handle form submission to save user data in "id" node and mark fingerprint mapping
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) {
      alert("Please select a user ID");
      return;
    }
    if (!selectedBranch) {
      alert("Please select a branch");
      return;
    }

    // Save branch name instead of branchId
    const userData = {
      id: userId,
      name,
      number,
      rollNumber,
      branch: selectedBranch.branchName, // Save branch name
      sem, // Selected semester value
    };

    try {
      const fingerprintRef = ref(db, `fingerprints/${userId}`);
      const fingerprintSnap = await get(fingerprintRef);
      if (fingerprintSnap.exists()) {
        alert("User ID already exists. Please choose a different ID.");
        return;
      }

      // Save the user data under the "id" node
      await set(ref(db, "id"), userData);

      // Set a flag in fingerprints to mark the numeric ID as used
      await set(ref(db, `fingerprints/${userId}`), "reserved");

      alert("Data saved successfully!");
      setExistingUserData(userData);
      // Reset fields after saving
      setName("");
      setNumber("");
      setRollNumber("");
      setBranch("");
      setSelectedBranch(null);
      setSem("");
      setAvailableIds((prev) => prev.filter((id) => id !== userId));
      setUserId("");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data. Please try again.");
    }
  };

  // Handle deletion: Remove both the fingerprint mapping and the "id" node record.
  const handleDelete = async () => {
    const deleteId = existingUserData?.id;
    if (!deleteId) {
      alert("No user data found for deletion.");
      return;
    }
    try {
      await remove(ref(db, `fingerprints/${deleteId}`));
      const idRef = ref(db, "id");
      const idSnap = await get(idRef);
      if (idSnap.exists() && idSnap.val().id === deleteId) {
        await remove(idRef);
      }
      alert("User data deleted successfully!");
      setExistingUserData(null);
      setAvailableIds((prev) =>
        [...prev, deleteId].sort((a, b) => Number(a) - Number(b))
      );
    } catch (error) {
      console.error("Error deleting user data:", error);
      alert("Error deleting user data. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100">
      <div className="flex flex-col lg:flex-row">
        <Sidebar />

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
              User Registration
            </h1>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-gray-700 mb-1">
                  Name:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <span className="px-3 text-gray-500">
                    <FaUser />
                  </span>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-2 focus:outline-none"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Phone Number Field */}
              <div>
                <label htmlFor="number" className="block text-gray-700 mb-1">
                  Phone Number:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <span className="px-3 text-gray-500">
                    <FaPhone />
                  </span>
                  <input
                    type="tel"
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    required
                    className="w-full p-2 focus:outline-none"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              {/* Roll Number Field */}
              <div>
                <label htmlFor="rollNumber" className="block text-gray-700 mb-1">
                  Roll Number:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <span className="px-3 text-gray-500">
                    <FaIdBadge />
                  </span>
                  <input
                    type="text"
                    id="rollNumber"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className="w-full p-2 focus:outline-none"
                    placeholder="Enter your roll number"
                  />
                </div>
              </div>

              {/* Branch Dropdown Field */}
              <div>
                <label htmlFor="branch" className="block text-gray-700 mb-1">
                  Branch:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <span className="px-3 text-gray-500">
                    <FaIdBadge />
                  </span>
                  <select
                    id="branch"
                    value={branch}
                    onChange={handleBranchChange}
                    required
                    className="w-full p-2 focus:outline-none"
                  >
                    <option value="">Select Branch</option>
                    {availableBranches.map((b) => (
                      <option key={b.branchId} value={b.branchId}>
                        {b.branchName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Semester Dropdown Field */}
              <div>
                <label htmlFor="sem" className="block text-gray-700 mb-1">
                  Semester:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <span className="px-3 text-gray-500">
                    <FaIdBadge />
                  </span>
                  <select
                    id="sem"
                    value={sem}
                    onChange={(e) => setSem(e.target.value)}
                    required
                    className="w-full p-2 focus:outline-none"
                  >
                    <option value="">Select Semester</option>
                    {availableSems.map((s, idx) => (
                      <option key={idx} value={s.sem}>
                        {s.sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* User ID Dropdown Field */}
              <div>
                <label htmlFor="userId" className="block text-gray-700 mb-1">
                  User ID:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <span className="px-3 text-gray-500">
                    <FaFingerprint />
                  </span>
                  <select
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                    className="w-full p-2 focus:outline-none"
                  >
                    <option value="">Select a User ID</option>
                    {availableIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
              >
                <FaPaperPlane className="mr-2" />
                Submit
              </button>
            </form>

            {/* Display user details if the record exists */}
            {existingUserData && (
              <div className="mt-8 p-6 bg-white shadow-md rounded-md border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  User Details
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <FaUser className="mr-2 text-gray-500" />
                    <p className="text-gray-700">
                      <strong>Name:</strong> {existingUserData.name}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <FaPhone className="mr-2 text-gray-500" />
                    <p className="text-gray-700">
                      <strong>Phone:</strong> {existingUserData.number}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <FaIdBadge className="mr-2 text-gray-500" />
                    <p className="text-gray-700">
                      <strong>Roll Number:</strong> {existingUserData.rollNumber}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <FaIdBadge className="mr-2 text-gray-500" />
                    <p className="text-gray-700">
                      <strong>Branch:</strong> {existingUserData.branch}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <FaIdBadge className="mr-2 text-gray-500" />
                    <p className="text-gray-700">
                      <strong>Semester:</strong> {existingUserData.sem}
                    </p>
                  </div>
                  <div className="flex items-center mt-4">
                    <FaFingerprint className="mr-2 text-gray-500" />
                    <p className="text-blue-600 font-semibold">
                      Waiting for fingerprint authentication...
                    </p>
                  </div>
                  <button
                    onClick={handleDelete}
                    className="mt-6 w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
                  >
                    <FaTrash className="mr-2" />
                    Delete User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Form;
