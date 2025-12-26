"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Sessions state
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessions, setSessions] = useState<{ id: string; expires: string; isCurrent: boolean }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Profile photo state
  const [imageLoading, setImageLoading] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setUserImage(session.user.image || null);
    }
  }, [session]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate on client side too
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" });
      return;
    }

    if (file.size > 1024 * 1024) {
      setMessage({ type: "error", text: "File too large. Maximum size is 1MB" });
      return;
    }

    setImageLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/users/profile/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setUserImage(data.image);
      await update({ image: data.image });
      setMessage({ type: "success", text: "Profile photo updated" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to upload image" });
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    setImageLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/users/profile/image", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove image");
      }

      setUserImage(null);
      await update({ image: null });
      setMessage({ type: "success", text: "Profile photo removed" });
    } catch {
      setMessage({ type: "error", text: "Failed to remove image" });
    } finally {
      setImageLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      await update({ name });
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password");
        return;
      }

      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully" });
    } catch {
      setPasswordError("Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/users/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load sessions" });
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const res = await fetch("/api/users/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke session");
      }

      setSessions(sessions.filter((s) => s.id !== sessionId));
      setMessage({ type: "success", text: "Session revoked successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to revoke session" });
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm("Revoke all other sessions? You will remain logged in on this device.")) return;

    setSessionsLoading(true);
    try {
      const res = await fetch("/api/users/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAll: true }),
      });

      if (!res.ok) throw new Error("Failed to revoke sessions");

      setSessions(sessions.filter((s) => s.isCurrent));
      setMessage({ type: "success", text: "All other sessions revoked" });
    } catch {
      setMessage({ type: "error", text: "Failed to revoke sessions" });
    } finally {
      setSessionsLoading(false);
    }
  };

  const openSessionsModal = () => {
    setShowSessionsModal(true);
    fetchSessions();
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");

    if (deleteConfirmation !== "DELETE") {
      setDeleteError("Please type DELETE to confirm");
      return;
    }

    setDeleteLoading(true);

    try {
      const res = await fetch("/api/users/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete account");
        setDeleteLoading(false);
        return;
      }

      // Sign out and redirect
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Failed to delete account");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
      <p className="text-muted mb-8">Manage your personal account information</p>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-error/10 border border-error/20 text-error"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative group">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={imageLoading}
                />
                <label
                  htmlFor="avatar-upload"
                  className={`block w-16 h-16 rounded-full overflow-hidden cursor-pointer ${
                    imageLoading ? "opacity-50" : ""
                  }`}
                >
                  {userImage ? (
                    <img
                      src={userImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent">
                      {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    {imageLoading ? (
                      <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                </label>
                {userImage && !imageLoading && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full flex items-center justify-center text-white hover:bg-error/80 transition-colors"
                    title="Remove photo"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div>
                <p className="font-medium">{session?.user?.name || "No name set"}</p>
                <p className="text-sm text-muted">{session?.user?.email}</p>
                <p className="text-xs text-muted mt-1">Click photo to change</p>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted mt-1">Email cannot be changed</p>
            </div>

            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </form>
        </section>

        {/* Security Section */}
        <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border gap-3">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted">Change your password</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPasswordModal(true)}
                className="w-full sm:w-auto"
              >
                Update
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border gap-3">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted">Add an extra layer of security</p>
              </div>
              <Button variant="secondary" size="sm" disabled className="w-full sm:w-auto">
                Coming Soon
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
              <div>
                <p className="font-medium">Active Sessions</p>
                <p className="text-sm text-muted">Manage your active sessions</p>
              </div>
              <Button variant="secondary" size="sm" onClick={openSessionsModal} className="w-full sm:w-auto">
                View
              </Button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card border border-error/20 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted">Permanently delete your account and all data</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="w-full sm:w-auto"
            >
              Delete Account
            </Button>
          </div>
        </section>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError("");
        }}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {passwordError}
            </div>
          )}

          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPasswordModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={passwordLoading} className="flex-1">
              Change Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePassword("");
          setDeleteConfirmation("");
          setDeleteError("");
        }}
        title="Delete Account"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="p-4 rounded-lg bg-error/10 border border-error/20">
            <p className="text-sm text-error font-medium mb-2">This action cannot be undone.</p>
            <p className="text-sm text-muted">
              This will permanently delete your account, all your data, and remove you from all organizations.
              Organizations where you are the sole owner will also be deleted.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {deleteError}
            </div>
          )}

          <div>
            <Label htmlFor="deletePassword">Your Password</Label>
            <Input
              id="deletePassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="deleteConfirmation">
              Type <span className="font-mono text-error">DELETE</span> to confirm
            </Label>
            <Input
              id="deleteConfirmation"
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deleteLoading}
              className="flex-1"
              disabled={deleteConfirmation !== "DELETE"}
            >
              Delete Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sessions Modal */}
      <Modal
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        title="Active Sessions"
      >
        <div className="space-y-4">
          {sessionsLoading ? (
            <div className="py-8 text-center text-muted">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted">No active sessions found</div>
          ) : (
            <>
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      s.isCurrent ? "border-accent/50 bg-accent/5" : "border-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {s.isCurrent ? "Current Session" : "Session"}
                        </span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full">
                            This device
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Expires: {new Date(s.expires).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRevokeSession(s.id)}
                        loading={revokingSession === s.id}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRevokeAllSessions}
                    loading={sessionsLoading}
                    className="w-full"
                  >
                    Revoke All Other Sessions
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
