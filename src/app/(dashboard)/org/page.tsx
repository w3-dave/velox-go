"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "BUSINESS";
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
}

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

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

export default function OrgPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit org state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete org state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Role change state
  const [changingRole, setChangingRole] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers(selectedOrg.id);
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/orgs");
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const data = await res.json();
      setOrgs(data);
      if (data.length > 0) {
        setSelectedOrg(data[0]);
      }
    } catch {
      console.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data);
    } catch {
      console.error("Failed to fetch members");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    setInviting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invitation");
      }

      setMessage({ type: "success", text: `Invitation sent to ${inviteEmail}` });
      setInviteEmail("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to send invitation" });
    } finally {
      setInviting(false);
    }
  };

  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, slug: editSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Failed to update organization");
        return;
      }

      // Update local state
      setSelectedOrg({ ...selectedOrg, name: data.name, slug: data.slug });
      setOrgs(orgs.map((o) => (o.id === selectedOrg.id ? { ...o, name: data.name, slug: data.slug } : o)));
      setShowEditModal(false);
      setMessage({ type: "success", text: "Organization updated successfully" });
    } catch {
      setEditError("Failed to update organization");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete organization");
        return;
      }

      // Remove from list and select another
      const remaining = orgs.filter((o) => o.id !== selectedOrg.id);
      setOrgs(remaining);
      setSelectedOrg(remaining[0] || null);
      setShowDeleteModal(false);
      setDeleteConfirmation("");
      setMessage({ type: "success", text: "Organization deleted successfully" });
    } catch {
      setDeleteError("Failed to delete organization");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: "ADMIN" | "MEMBER") => {
    if (!selectedOrg) return;

    setChangingRole(memberId);

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to change role" });
        return;
      }

      // Update local state
      setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
      setMessage({ type: "success", text: "Role updated successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to change role" });
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedOrg) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to remove member" });
        return;
      }

      setMembers(members.filter((m) => m.id !== memberId));
      setMessage({ type: "success", text: "Member removed successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to remove member" });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-accent/20 text-accent";
      case "ADMIN":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-muted/20 text-muted";
    }
  };

  const openEditModal = () => {
    if (selectedOrg) {
      setEditName(selectedOrg.name);
      setEditSlug(selectedOrg.slug);
      setEditError("");
      setShowEditModal(true);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-card rounded w-48" />
          <div className="h-4 bg-card rounded w-72" />
          <div className="h-64 bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Organization</h1>
      <p className="text-muted mb-8">Manage your organization and team members</p>

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

      {/* Organization Selector */}
      {orgs.length > 1 && (
        <div className="mb-6">
          <Label>Select Organization</Label>
          <select
            value={selectedOrg?.id || ""}
            onChange={(e) => {
              const org = orgs.find((o) => o.id === e.target.value);
              setSelectedOrg(org || null);
            }}
            className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent mt-1.5"
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedOrg && (
        <div className="space-y-8">
          {/* Organization Details */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Organization Details</h2>
              {selectedOrg.role === "OWNER" && (
                <Button variant="secondary" size="sm" onClick={openEditModal}>
                  Edit
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-name">Name</Label>
                <Input id="org-name" type="text" value={selectedOrg.name} disabled className="opacity-60" />
              </div>
              <div>
                <Label htmlFor="org-slug">Slug</Label>
                <Input id="org-slug" type="text" value={selectedOrg.slug} disabled className="opacity-60" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedOrg.type === "BUSINESS" ? "bg-accent/20 text-accent" : "bg-muted/20 text-muted"
                }`}
              >
                {selectedOrg.type}
              </span>
              <span className="text-sm text-muted">
                Your role: <span className="font-medium text-foreground">{selectedOrg.role}</span>
              </span>
            </div>
          </section>

          {/* Team Members */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Team Members</h2>
              <span className="text-sm text-muted">{members.length} members</span>
            </div>

            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                      {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.user.name || "No name"}</p>
                      <p className="text-sm text-muted">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedOrg.role === "OWNER" && member.role !== "OWNER" ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as "ADMIN" | "MEMBER")}
                          disabled={changingRole === member.id}
                          className="px-3 py-1.5 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1.5 text-muted hover:text-error transition-colors"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Invite Members */}
          {(selectedOrg.role === "OWNER" || selectedOrg.role === "ADMIN") && (
            <section className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Invite Team Member</h2>
              <form onSubmit={handleInvite} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                  className="px-4 py-2 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <Button type="submit" loading={inviting}>
                  Send Invite
                </Button>
              </form>
            </section>
          )}

          {/* Danger Zone */}
          {selectedOrg.role === "OWNER" && selectedOrg.type === "BUSINESS" && (
            <section className="bg-card border border-error/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Organization</p>
                  <p className="text-sm text-muted">Permanently delete this organization and all its data</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                  Delete Organization
                </Button>
              </div>
            </section>
          )}
        </div>
      )}

      {orgs.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted mb-4">You don&apos;t belong to any organization yet.</p>
          <Button>Create Organization</Button>
        </div>
      )}

      {/* Edit Organization Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Organization"
      >
        <form onSubmit={handleEditOrg} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {editError}
            </div>
          )}

          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-slug">Slug</Label>
            <Input
              id="edit-slug"
              type="text"
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
            />
            <p className="text-xs text-muted mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={editLoading} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Organization Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation("");
          setDeleteError("");
        }}
        title="Delete Organization"
      >
        <form onSubmit={handleDeleteOrg} className="space-y-4">
          <div className="p-4 rounded-lg bg-error/10 border border-error/20">
            <p className="text-sm text-error font-medium mb-2">This action cannot be undone.</p>
            <p className="text-sm text-muted">
              This will permanently delete the organization, all team members, subscriptions, and associated data.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {deleteError}
            </div>
          )}

          <div>
            <Label htmlFor="delete-confirmation">
              Type <span className="font-mono text-error">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirmation"
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deleteLoading}
              className="flex-1"
              disabled={deleteConfirmation !== "DELETE"}
            >
              Delete Organization
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
