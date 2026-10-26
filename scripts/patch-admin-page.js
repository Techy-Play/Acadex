const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('src/app/admin/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update DashStats interface
const oldDashStats = `interface DashStats {
  pendingRequests: number;
  unreadMessages: number;
}`;

const newDashStats = `interface DashStats {
  pendingRequests: number;
  unreadMessages: number;
  pendingAdminRequests?: number;
  latestAdminRequest?: {
    id: string;
    type: string;
    requestedByName: string;
    targetUserName?: string | null;
    adminNote?: string;
    createdAt?: string;
  } | null;
  latestMessage?: {
    id: string;
    name: string;
    email: string;
    subject: string;
    snippet: string;
    createdAt?: string;
  } | null;
  securityAlertCount?: number;
  latestSecurityAlert?: {
    id: string;
    action: string;
    description: string;
    actorName: string;
    createdAt?: string;
  } | null;
}`;

content = content.replace(oldDashStats, newDashStats);

// 2. Add Super Admin Red Alert Banner right after Hero banner
const heroBannerEnd = `            {/* Quick Action to Dedicated Audit Logs Page */}
            <Link href="/admin/activity">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 h-9 font-medium shadow-xs hover:bg-primary/10 hover:text-primary hover:border-primary/20"
              >
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Audit Logs</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>`;

const superAdminRedAlerts = `${heroBannerEnd}

      {/* ─── Super Admin Priority Red Alert Section ─── */}
      {isSuperAdmin && ((dashStats.pendingAdminRequests && dashStats.pendingAdminRequests > 0) || (dashStats.securityAlertCount && dashStats.securityAlertCount > 0)) && (
        <div className="space-y-3">
          {dashStats.pendingAdminRequests && dashStats.pendingAdminRequests > 0 && (
            <div className="rounded-2xl border-2 border-red-500/60 bg-linear-to-r from-red-500/15 via-red-500/10 to-transparent p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Critical Super Admin Alert
                      </span>
                      <Badge className="bg-red-600 text-white text-[10px] font-bold">
                        {dashStats.pendingAdminRequests} Pending
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {dashStats.latestAdminRequest?.requestedByName || "Sub-Admin"} requested:{" "}
                      <span className="text-red-600 dark:text-red-400 font-semibold">
                        {dashStats.latestAdminRequest?.type === "create_admin"
                          ? "New Admin Account Authorization"
                          : "Section / Stream Privilege Escalation"}
                      </span>
                      {dashStats.latestAdminRequest?.targetUserName && \` for \${dashStats.latestAdminRequest.targetUserName}\`}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dashStats.latestAdminRequest?.adminNote
                        ? \`Message: "\${dashStats.latestAdminRequest.adminNote}"\`
                        : "Sub-admins cannot proceed with these system alterations without your Super Admin approval."}
                    </p>
                  </div>
                </div>
                <Link href="/admin/admin-requests" className="shrink-0 self-end sm:self-auto">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold gap-1.5 h-9 shadow-xs">
                    <span>Review & Authorize</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {dashStats.securityAlertCount && dashStats.securityAlertCount > 0 && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold text-red-600 dark:text-red-400 mr-2">
                    Security Notice ({dashStats.securityAlertCount} failed events):
                  </span>
                  <span className="text-foreground">
                    {dashStats.latestSecurityAlert?.description || "Authentication or authorization failure recorded in audit log."}
                  </span>
                </div>
              </div>
              <Link href="/admin/activity?status=failure" className="shrink-0">
                <Button variant="outline" size="sm" className="border-red-500/40 text-red-600 hover:bg-red-500/10 rounded-lg text-xs h-8">
                  Inspect Security Log →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}`;

content = content.replace(heroBannerEnd, superAdminRedAlerts);

// 3. Pass latestMessage to PriorityAlertCards
content = content.replace(
  'pendingRequests={dashStats.pendingRequests}\n              unreadMessages={dashStats.unreadMessages}\n              loading={loading}',
  'dashStats={dashStats}\n              loading={loading}'
);
content = content.replace(
  'pendingRequests={dashStats.pendingRequests}\n            unreadMessages={dashStats.unreadMessages}\n            loading={loading}\n            horizontal',
  'dashStats={dashStats}\n            loading={loading}\n            horizontal'
);
content = content.replace(
  'pendingRequests={dashStats.pendingRequests}\n            unreadMessages={dashStats.unreadMessages}\n            loading={loading}\n            horizontal',
  'dashStats={dashStats}\n            loading={loading}\n            horizontal'
);

// 4. Update PriorityAlertCards definition
const oldPriorityAlertCards = `function PriorityAlertCards({
  pendingRequests,
  unreadMessages,
  loading,
  horizontal,
}: {
  pendingRequests: number;
  unreadMessages: number;
  loading: boolean;
  horizontal?: boolean;
}) {`;

const newPriorityAlertCards = `function PriorityAlertCards({
  dashStats,
  loading,
  horizontal,
}: {
  dashStats: DashStats;
  loading: boolean;
  horizontal?: boolean;
}) {
  const pendingRequests = dashStats.pendingRequests;
  const unreadMessages = dashStats.unreadMessages;
  const latestMessage = dashStats.latestMessage;`;

content = content.replace(oldPriorityAlertCards, newPriorityAlertCards);

// 5. Update Unread Contact Messages description in PriorityAlertCards
const oldMessageDesc = `<p className="text-[11px] text-muted-foreground truncate">Inquiries & student feedback</p>`;
const newMessageDesc = `<p className="text-[11px] text-muted-foreground line-clamp-2">
                  {latestMessage ? (
                    <>
                      <strong className="text-foreground">{latestMessage.name}:</strong> &quot;{latestMessage.snippet || latestMessage.subject}&quot;
                    </>
                  ) : (
                    "Inquiries & student feedback"
                  )}
                </p>`;

content = content.replace(oldMessageDesc, newMessageDesc);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched src/app/admin/page.tsx with Super Admin Red Alerts!');
