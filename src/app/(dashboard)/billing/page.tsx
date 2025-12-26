"use client";

import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { veloxApps } from "@/lib/apps";
import { useState, useEffect } from "react";

interface Subscription {
  id: string;
  appSlug: string;
  status: string;
  stripePriceId: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/billing/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      setSubscriptions(data);
    } catch {
      console.error("Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async (subscriptionId: string) => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      console.error("Failed to open billing portal");
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Canceling</span>;
    }
    switch (status) {
      case "active":
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Active</span>;
      case "trialing":
        return <span className="px-2 py-1 rounded-full text-xs bg-accent/20 text-accent">Trial</span>;
      case "past_due":
        return <span className="px-2 py-1 rounded-full text-xs bg-error/20 text-error">Past Due</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-muted/20 text-muted">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-80 mb-8" />

        <section className="mb-8">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>

        <section>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>
      </div>
    );
  }

  const subscribedApps = subscriptions.map((s) => s.appSlug);
  const availableApps = veloxApps.filter((app) => !subscribedApps.includes(app.slug) && app.status === "available");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Billing & Subscriptions</h1>
      <p className="text-muted mb-8">Manage your app subscriptions and billing settings</p>

      {/* Active Subscriptions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Active Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="font-medium mb-1">No active subscriptions</p>
            <p className="text-sm text-muted">Subscribe to apps below to unlock their full potential.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => {
              const app = veloxApps.find((a) => a.slug === sub.appSlug);
              return (
                <div key={sub.id} className="bg-card border border-border rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: `${app?.color}20` }}
                      >
                        {app?.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{app?.name || sub.appSlug}</p>
                        <p className="text-sm text-muted">
                          Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                      <Button variant="secondary" size="sm" onClick={() => handleManageSubscription(sub.id)}>
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Apps */}
      {availableApps.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Available Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableApps.map((app) => (
              <div key={app.slug} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${app.color}20` }}
                  >
                    {app.icon}
                  </div>
                  <div>
                    <p className="font-medium">{app.name}</p>
                    <p className="text-sm text-muted">{app.tagline}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">${app.monthlyPrice?.toFixed(2) || "9.99"}/month</span>
                  <Button size="sm" href={`/billing/checkout/${app.slug}`}>
                    Subscribe
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Billing Portal */}
      <section className="mt-8">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">Billing Portal</p>
              <p className="text-sm text-muted">Update payment methods, view invoices, and manage billing</p>
            </div>
            <Button variant="secondary" onClick={() => handleManageSubscription("")} className="w-full sm:w-auto">
              Open Portal
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
