import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { veloxApps } from "@/lib/apps";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-muted mt-1">
          Access your apps and manage your subscriptions
        </p>
      </div>

      <h2 className="text-lg font-semibold mb-4">Your Apps</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {veloxApps.map((app) => (
          <Card key={app.slug} className="flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${app.color}20` }}
              >
                {app.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{app.name}</h3>
                <p className="text-sm text-muted">{app.tagline}</p>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
              {app.status === "available" ? (
                <>
                  <span className="text-sm text-muted">
                    ${app.monthlyPrice}/mo
                  </span>
                  <Button size="sm" href={app.url}>
                    Open App
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-amber-400">Coming Soon</span>
                  <Button size="sm" variant="secondary" disabled>
                    Notify Me
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
