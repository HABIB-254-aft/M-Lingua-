"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/auth";
import { getUserProfile, saveUserProfile, usernameExists } from "@/lib/firebase/firestore";
import { compressImage } from "@/lib/utils/imageCompression";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    username: "",
  });
  const [languagePreference, setLanguagePreference] = useState("en");
  const [accessibilityDefaults, setAccessibilityDefaults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const firebaseUser = getCurrentUser();
        
        if (firebaseUser) {
          // Load from Firestore first
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: profile.displayName || firebaseUser.displayName,
              username: profile.username,
              photoURL: profile.photoURL || firebaseUser.photoURL,
            };
            setUser(userData);
            setEditForm({
              displayName: userData.displayName || "",
              username: userData.username || "",
            });
            // Update localStorage for backward compatibility
            localStorage.setItem("mlingua_auth", JSON.stringify(userData));
            return;
          }
        }
        
        // Fallback to localStorage
        const authData = localStorage.getItem("mlingua_auth");
        if (authData) {
          const userData = JSON.parse(authData);
          setUser(userData);
          setEditForm({
            displayName: userData.displayName || "",
            username: userData.username || "",
          });
        } else {
          // If not logged in, redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        router.push("/login");
      }
    };

    loadUserData();

    // Load preferences
    try {
      const lang = localStorage.getItem("languagePreference");
      if (lang) setLanguagePreference(lang);
      const acc = localStorage.getItem("accessibilityDefaults");
      if (acc === "true") setAccessibilityDefaults(true);
    } catch {
      // ignore
    }
  }, [router]);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const firebaseUser = getCurrentUser();
      
      // Validate username if it changed
      if (editForm.username && editForm.username !== user?.username) {
        // Check if username already exists (excluding current user)
        const exists = await usernameExists(editForm.username, firebaseUser?.uid);
        if (exists) {
          alert("This username is already taken. Please choose a different username.");
          return;
        }
      }
      
      if (firebaseUser) {
        // Update profile in Firestore
        const { success, error } = await saveUserProfile(firebaseUser.uid, {
          displayName: editForm.displayName,
          username: editForm.username,
        });

        if (!success) {
          alert(`Error updating profile: ${error}`);
          return;
        }

        // Reload profile from Firestore to get latest data
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) {
          const updatedUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: updatedProfile.displayName || firebaseUser.displayName,
            username: updatedProfile.username,
            photoURL: updatedProfile.photoURL || firebaseUser.photoURL,
          };
          setUser(updatedUser);
          
          // Also update localStorage for backward compatibility
          localStorage.setItem("mlingua_auth", JSON.stringify(updatedUser));
        }
        
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        // Fallback to localStorage for backward compatibility
        const updatedUser = {
          ...user,
          displayName: editForm.displayName,
          username: editForm.username,
        };
        localStorage.setItem("mlingua_auth", JSON.stringify(updatedUser));
        
        // Update users list
        const users = JSON.parse(localStorage.getItem("mlingua_users") || "[]");
        const userIndex = users.findIndex((u: any) => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex] = updatedUser;
          localStorage.setItem("mlingua_users", JSON.stringify(users));
        }

        setUser(updatedUser);
        setIsEditing(false);
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile.");
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      displayName: user?.displayName || "",
      username: user?.username || "",
    });
    setIsEditing(false);
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    try {
      // Compress and resize image to ensure it fits within Firestore's 1MB limit
      const base64Image = await compressImage(file);
      const firebaseUser = getCurrentUser();
      
      // Check if compressed image is still too large (shouldn't happen, but safety check)
      if (base64Image.length > 1000 * 1024) { // 1MB
        alert("Image is too large even after compression. Please choose a smaller image.");
        return;
      }
      
      if (firebaseUser) {
        // Update profile in Firestore
        const { success, error } = await saveUserProfile(firebaseUser.uid, {
          photoURL: base64Image,
        });

        if (!success) {
          alert(`Error updating profile picture: ${error}`);
          return;
        }

        // Reload profile from Firestore to ensure we have the latest data
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) {
          const updatedUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: updatedProfile.displayName || firebaseUser.displayName,
            username: updatedProfile.username,
            photoURL: updatedProfile.photoURL || firebaseUser.photoURL,
          };
          setUser(updatedUser);
          
          // Also update localStorage for backward compatibility
          localStorage.setItem("mlingua_auth", JSON.stringify(updatedUser));
          
          // Update users list (for backward compatibility)
          const users = JSON.parse(localStorage.getItem("mlingua_users") || "[]");
          const userIndex = users.findIndex((u: any) => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem("mlingua_users", JSON.stringify(users));
          }

          alert("Profile picture updated successfully!");
          return;
        }
      }

      // Fallback: Update local state if Firestore update failed
      const updatedUser = {
        ...user,
        photoURL: base64Image,
      };
      localStorage.setItem("mlingua_auth", JSON.stringify(updatedUser));
      
      // Update users list
      const users = JSON.parse(localStorage.getItem("mlingua_users") || "[]");
      const userIndex = users.findIndex((u: any) => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem("mlingua_users", JSON.stringify(users));
      }

      setUser(updatedUser);
      alert("Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload profile picture");
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) {
      return;
    }

    try {
      const firebaseUser = getCurrentUser();
      
      if (firebaseUser) {
        // Update profile in Firestore
        const { success, error } = await saveUserProfile(firebaseUser.uid, {
          photoURL: undefined,
        });

        if (!success) {
          alert(`Error removing profile picture: ${error}`);
          return;
        }

        // Reload profile from Firestore to ensure we have the latest data
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) {
          const updatedUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: updatedProfile.displayName || firebaseUser.displayName,
            username: updatedProfile.username,
            photoURL: updatedProfile.photoURL || firebaseUser.photoURL,
          };
          setUser(updatedUser);
          
          // Also update localStorage for backward compatibility
          localStorage.setItem("mlingua_auth", JSON.stringify(updatedUser));
          
          // Update users list (for backward compatibility)
          const users = JSON.parse(localStorage.getItem("mlingua_users") || "[]");
          const userIndex = users.findIndex((u: any) => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem("mlingua_users", JSON.stringify(users));
          }

          alert("Profile picture removed");
          return;
        }
      }

      // Fallback: Update local state if Firestore update failed
      const updatedUser = {
        ...user,
        photoURL: undefined,
      };
      localStorage.setItem("mlingua_auth", JSON.stringify(updatedUser));
      
      // Update users list
      const users = JSON.parse(localStorage.getItem("mlingua_users") || "[]");
      const userIndex = users.findIndex((u: any) => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem("mlingua_users", JSON.stringify(users));
      }

      setUser(updatedUser);
      alert("Profile picture removed");
    } catch (error) {
      console.error("Error removing photo:", error);
      alert("Error removing profile picture");
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguagePreference(value);
    try {
      localStorage.setItem("languagePreference", value);
    } catch {
      // ignore
    }
  };

  const handleAccessibilityToggle = (checked: boolean) => {
    setAccessibilityDefaults(checked);
    try {
      localStorage.setItem("accessibilityDefaults", checked ? "true" : "false");
    } catch {
      // ignore
    }
  };

  const handleExportData = () => {
    try {
      const userData = {
        profile: user,
        preferences: {
          language: languagePreference,
          accessibility: accessibilityDefaults,
          darkMode: document.documentElement.classList.contains("dark"),
          blindMode: localStorage.getItem("accessibilityMode") === "blind",
          communicationMode: localStorage.getItem("communicationMode") || "standard",
        },
        translationHistory: JSON.parse(localStorage.getItem("translationHistory") || "[]"),
        timestamp: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `m-lingua-data-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      alert("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data");
    }
  };

  const handleSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        localStorage.removeItem("mlingua_auth");
        router.push("/login");
      } catch {
        router.push("/login");
      }
    }
  };

  const handleDeleteAccount = () => {
    const confirmMessage = "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.";
    const doubleConfirm = "This is your final warning. Type 'DELETE' to confirm account deletion.";
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    const userInput = prompt(doubleConfirm);
    if (userInput !== "DELETE") {
      alert("Account deletion cancelled");
      return;
    }
    
    try {
      // Remove user from users list
      const users = JSON.parse(localStorage.getItem("mlingua_users") || "[]");
      const filteredUsers = users.filter((u: any) => u.id !== user?.id);
      localStorage.setItem("mlingua_users", JSON.stringify(filteredUsers));
      
      // Clear auth
      localStorage.removeItem("mlingua_auth");
      
      // Clear user-specific data
      localStorage.removeItem("translationHistory");
      
      alert("Account deleted successfully");
      router.push("/");
    } catch {
      alert("Error deleting account");
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 pt-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-12 flex items-start justify-center">
      <div className="w-full max-w-4xl mx-auto px-6 text-left">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="Go back"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100 text-center">
          Profile
        </h1>

        {/* Profile Information Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile Information</h2>
          
          <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-6 rounded-sm">
            {/* Profile Picture */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(user.displayName || user.email || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-sm text-sm font-medium hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    📷 Change
                  </button>
                  {user.photoURL && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-4 py-2 bg-gray-600 text-white rounded-sm text-sm font-medium hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2"
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name */}
            {isEditing ? (
              <div className="mb-4">
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
                />
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Name</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{user.displayName || "Not set"}</div>
                </div>
              </div>
            )}

            {/* Username */}
            {isEditing ? (
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
                />
              </div>
            ) : (
              user.username && (
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Username</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                  </div>
                </div>
              )
            )}

            {/* Email */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{user.email || "Not set"}</div>
              </div>
            </div>

            {/* Edit Profile Button */}
            {isEditing ? (
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEditProfile}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </section>

        {/* Account Preferences Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Preferences</h2>
          
          <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-6 rounded-sm space-y-4">
            {/* Language Preference */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">🌐</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Language</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Preferred interface language</div>
                </div>
              </div>
              <select
                value={languagePreference}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            {/* Accessibility Defaults */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">♿</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Accessibility Defaults</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Remember accessibility settings</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={accessibilityDefaults}
                  onChange={(e) => handleAccessibilityToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Management</h2>
          
          <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-6 rounded-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📥</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Export App Data</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Download your app data</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="px-6 py-2 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Export Data
            </button>
          </div>
        </section>

        {/* Account Actions Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Actions</h2>
          
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span className="text-2xl">🚪</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Sign Out</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sign out of your account</div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className="w-full flex items-center gap-3 p-4 border border-red-300 dark:border-red-700 rounded-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              <span className="text-2xl">🗑️</span>
              <div>
                <div className="font-medium text-red-700 dark:text-red-300">Delete Account</div>
                <div className="text-sm text-red-600 dark:text-red-400">Permanently delete your account</div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

