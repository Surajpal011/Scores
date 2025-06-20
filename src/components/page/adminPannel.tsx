import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Check,
  X,
  Mail,
  ChevronDown,
  ChevronRight,
  Clock,
  Ban,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { doc, updateDoc } from "firebase/firestore";

interface Stats {
  approvedUsers: number;
  pendingUsers: number;
}

interface PendingUser {
  id: string;
  name: string;
  email: string;
  registrationDate: Date;
}

interface ApprovedUser {
  id: string;
  name: string;
  email: string;
  registrationDate: Date;
}

interface BannedUser {
  id: string;
  name: string;
  email: string;
  registrationDate: Date;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    approvedUsers: 0,
    pendingUsers: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isUsersExpanded, setIsUsersExpanded] = useState(false);
  const { currentUser } = useAuth(); // Assuming useAuth is your custom AuthContext hook
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "developer";

  const formatDate = (dateInput: string | Date) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUserApproval = async (userId: string, isApproved: boolean) => {
    try {
      const userRef = doc(db, "users", userId);

      await updateDoc(userRef, {
        status: isApproved ? "approved" : "banned",
        ...(isApproved ? {} : { banReason: "Rejected by admin" }), // Optional
      });

      console.log(`User ${isApproved ? "approved" : "rejected"} successfully`);

      // Update UI lists
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));

      if (isApproved) {
        const approvedUser = pendingUsers.find((u) => u.id === userId);
        if (approvedUser) {
          setApprovedUsers((prev) => [...prev, approvedUser]);
        }
      } else {
        const bannedUser = pendingUsers.find((u) => u.id === userId);
        if (bannedUser) {
          setBannedUsers((prev) => [
            ...prev,
            { ...bannedUser, banReason: "Rejected by admin" },
          ]);
        }
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleUserBan = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);

      await updateDoc(userRef, {
        status: "banned",
      });

      console.log("User banned successfully");

      // Refresh user data after update
      setApprovedUsers((prev) => prev.filter((user) => user.id !== userId));

      setBannedUsers((prev) => [
        ...prev,
        {
          ...approvedUsers.find((u) => u.id === userId)!,
          status: "banned",
          banReason: "Violated terms of use", // Optional: You can make this dynamic
        },
      ]);
    } catch (error) {
      console.error("Error banning user:", error);
    }
  };

  const handleUserUnban = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);

      // Update status in Firestore
      await updateDoc(userRef, {
        status: "approved",
      });

      // Find the user in bannedUsers and remove from there
      const unbannedUser = bannedUsers.find((user) => user.id === userId);
      if (!unbannedUser) return;

      // Remove from bannedUsers
      setBannedUsers((prev) => prev.filter((user) => user.id !== userId));

      // Add to approvedUsers
      setApprovedUsers((prev) => [
        ...prev,
        { ...unbannedUser, status: "approved" },
      ]);

      // Optional: toast or feedback
      console.log(`User ${userId} has been unbanned and marked as approved.`);
    } catch (error) {
      console.error("Error unbanning user:", error);
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Collapse users dropdown when navigating to dashboard or visitors
    if (section === "dashboard" || section === "visitors") {
      setIsUsersExpanded(false);
    }
  };

  const handleUsersClick = () => {
    if (isUsersExpanded) {
      setIsUsersExpanded(false);
    } else {
      setIsUsersExpanded(true);
      setActiveSection("users-pending");
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        {trend && (
          <div className="flex items-center text-green-400 text-sm">
            <TrendingUp size={14} className="mr-1" />
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </div>
  );

  useEffect(() => {
    const fetchUserStatsAndData = async () => {
      try {
        const usersRef = collection(db, "users");

        // Approved Users
        const approvedQuery = query(
          usersRef,
          where("status", "==", "approved")
        );
        const approvedSnap = await getDocs(approvedQuery);
        const approved: ApprovedUser[] = approvedSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "N/A",
          registrationDate: doc.data().createdAt?.toDate?.() || new Date(),
        }));

        // Pending Users
        const pendingQuery = query(usersRef, where("status", "==", "pending"));
        const pendingSnap = await getDocs(pendingQuery);
        const pending: PendingUser[] = pendingSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "N/A",
          registrationDate: doc.data().createdAt?.toDate?.() || new Date(),
        }));

        // Banned Users
        const bannedQuery = query(usersRef, where("status", "==", "banned"));
        const bannedSnap = await getDocs(bannedQuery);
        const banned: BannedUser[] = bannedSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "N/A",
          registrationDate: doc.data().createdAt?.toDate?.() || new Date(),
        }));

        // Update state
        setStats({
          approvedUsers: approved.length,
          pendingUsers: pending.length,
        });

        setApprovedUsers(approved);
        setPendingUsers(pending);
        setBannedUsers(banned);
      } catch (error) {
        console.error("Error fetching user stats or data:", error);
      }
    };

    fetchUserStatsAndData();
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-200"
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => handleSectionChange("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeSection === "dashboard"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>

              <div>
                <button
                  onClick={handleUsersClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    activeSection.startsWith("users")
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Users size={18} />
                  Users
                  {pendingUsers.length > 0 && (
                    <span className="ml-auto bg-yellow-600 text-white text-xs px-2 py-1 rounded-full mr-2">
                      {pendingUsers.length}
                    </span>
                  )}
                  {isUsersExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                {/* User Dropdown */}
                {isUsersExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    <button
                      onClick={() => setActiveSection("users-pending")}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors duration-200 ${
                        activeSection === "users-pending"
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      <Clock size={14} />
                      Pending Users
                      {pendingUsers.length > 0 && (
                        <span className="ml-auto bg-yellow-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {pendingUsers.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveSection("users-approved")}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors duration-200 ${
                        activeSection === "users-approved"
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      <UserCheck size={14} />
                      Approved Users
                      {approvedUsers.length > 0 && (
                        <span className="ml-auto bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {approvedUsers.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveSection("users-banned")}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors duration-200 ${
                        activeSection === "users-banned"
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      <Ban size={14} />
                      Banned Users
                      {bannedUsers.length > 0 && (
                        <span className="ml-auto bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {bannedUsers.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-wide capitalize">
                {activeSection === "dashboard" && "Dashboard"}
                {activeSection === "users-pending" && "Pending Users"}
                {activeSection === "users-approved" && "Approved Users"}
                {activeSection === "users-banned" && "Banned Users"}
                {activeSection === "visitors" && "Live Visitors"}
              </h2>
              <p className="text-gray-400 mt-2">
                {activeSection === "dashboard" &&
                  "Overview of your platform metrics"}
                {activeSection === "users-pending" &&
                  "Manage pending user registrations"}
                {activeSection === "users-approved" &&
                  "View and manage approved users"}
                {activeSection === "users-banned" &&
                  "View and manage banned users"}
                {activeSection === "visitors" &&
                  "Monitor real-time visitor activity"}
              </p>
            </header>

            {/* Dashboard Content */}
            {activeSection === "dashboard" && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StatCard
                    title="Approved Users"
                    value={stats.approvedUsers.toLocaleString()}
                    icon={<UserCheck size={24} />}
                    color="bg-blue-600"
                  />
                  <StatCard
                    title="Pending Users"
                    value={stats.pendingUsers.toLocaleString()}
                    icon={<UserX size={24} />}
                    color="bg-yellow-600"
                  />
                </div>
              </div>
            )}

            {/* Pending Users Content */}
            {activeSection === "users-pending" && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                      Pending User Approvals
                    </h3>
                    <div className="flex gap-2">
                      <span className="bg-yellow-600 px-3 py-1 rounded-full text-sm">
                        {pendingUsers.length} Pending
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Registration Date
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {pendingUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-white">
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-400">
                                  New User
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-gray-300">
                              <Mail size={14} className="mr-2" />
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(user.registrationDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  handleUserApproval(user.id, true)
                                }
                                className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200"
                                title="Approve User"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleUserApproval(user.id, false)
                                }
                                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors duration-200"
                                title="Reject User"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Approved Users Content */}
            {activeSection === "users-approved" && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Approved Users</h3>
                    <div className="flex gap-2">
                      <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
                        {approvedUsers.length} Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Registration Date
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {approvedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-white">
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Active User
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-gray-300">
                              <Mail size={14} className="mr-2" />
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(user.registrationDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleUserBan(user.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors duration-200"
                              title="Ban User"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Banned Users Content */}
            {activeSection === "users-banned" && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Banned Users</h3>
                    <div className="flex gap-2">
                      <span className="bg-red-600 px-3 py-1 rounded-full text-sm">
                        {bannedUsers.length} Banned
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Registration Date
                        </th>

                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {bannedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-white">
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {user.name}
                                </div>
                                <div className="text-sm text-red-400">
                                  Banned User
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-gray-300">
                              <Mail size={14} className="mr-2" />
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(user.registrationDate)}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleUserUnban(user.id)}
                              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200"
                              title="Approve User"
                            >
                              <Check size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
