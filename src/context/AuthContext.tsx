import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  updateProfile as firebaseUpdateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

interface User {
  uid: string;
  name: string;
  email: string;
  role: "user" | "admin" | "developer";
  status: "pending" | "approved" | "banned";
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  updateProfile: (data: {
    displayName: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
  logout: () => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async (): Promise<void> => {
    setLoading(true);
    const user = auth.currentUser;

    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            uid: user.uid,
            name: userData.name,
            email: userData.email,
            role: userData.role || "user",
            status: userData.status || "pending",
          });
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error fetching user from Firestore:", error);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      checkAuth();
    });

    return () => unsubscribe();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateProfile = async ({
    displayName,
    currentPassword,
    newPassword,
  }: {
    displayName: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");

    try {
      // Update display name in Firebase Auth and Firestore
      if (displayName) {
        await firebaseUpdateProfile(user, { displayName });
        await setDoc(
          doc(db, "users", user.uid),
          { name: displayName },
          { merge: true }
        );
        setCurrentUser((prev) =>
          prev ? { ...prev, name: displayName } : prev
        );
      }

      // Update password if both currentPassword and newPassword provided
      if (currentPassword && newPassword) {
        const credential = EmailAuthProvider.credential(
          user.email!,
          currentPassword
        );

        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
      }
    } catch (error: any) {
      console.error("Failed to update profile or password:", error);
      throw new Error(error.message || "Profile update failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        checkAuth,
        updateProfile,
        logout,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
