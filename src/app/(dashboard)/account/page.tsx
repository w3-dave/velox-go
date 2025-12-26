"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState(session?.user?.name || "");
  const [email] = useState(session?.user?.email || "");

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
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent">
                {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium">{session?.user?.name || "No name set"}</p>
                <p className="text-sm text-muted">{session?.user?.email}</p>
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
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted">Change your password</p>
              </div>
              <Button variant="secondary" size="sm">
                Update
              </Button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted">Add an extra layer of security</p>
              </div>
              <Button variant="secondary" size="sm">
                Enable
              </Button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Active Sessions</p>
                <p className="text-sm text-muted">Manage your active sessions</p>
              </div>
              <Button variant="secondary" size="sm">
                View
              </Button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card border border-error/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted">Permanently delete your account and all data</p>
            </div>
            <Button variant="danger" size="sm">
              Delete Account
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
