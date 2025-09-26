import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { getSupabase, isSupabaseConfigured, getCurrentSession, signInWithEmail, signOut } from "@/lib/supabase";
import { getCurrentUserTeam, setCurrentUserTeam } from "@/lib/user";
import type { Alert, AlertInput, Severity } from "@shared/api";
import { createAlert, deleteAlert, listAlerts, toggleAlertActive, updateAlert, getVisibleAlertsForUser, snoozeAlert, markAlertRead, getUserDeliveries } from "@/services/alerts";

export default function Index() {
  const supabaseReady = isSupabaseConfigured() && !!getSupabase();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!supabaseReady) return;
    getCurrentSession().then((s) => setSessionUserId(s?.user.id ?? null));
    const sub = getSupabase()!.auth.onAuthStateChange((_e, s) => setSessionUserId(s?.user?.id ?? null));
    return () => sub.data.subscription.unsubscribe();
  }, [supabaseReady]);

  const [team, setTeam] = useState<string>(getCurrentUserTeam() ?? "");
  useEffect(() => { setCurrentUserTeam(team); }, [team]);

  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: listAlerts,
    enabled: supabaseReady && !!sessionUserId,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries", sessionUserId],
    queryFn: () => getUserDeliveries(sessionUserId!),
    enabled: supabaseReady && !!sessionUserId,
  });

  const [editing, setEditing] = useState<Alert | null>(null);
  const [open, setOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: (body: AlertInput) => createAlert(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert created" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: (p: { id: string; patch: Partial<AlertInput> }) => updateAlert(p.id, p.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert updated" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Alert deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });
  const toggleMut = useMutation({
    mutationFn: (p: { id: string; active: boolean }) => toggleAlertActive(p.id, p.active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const visibleAlertsQuery = useQuery({
    queryKey: ["visible-alerts", sessionUserId, team],
    queryFn: () => getVisibleAlertsForUser(sessionUserId!, team || null),
    enabled: supabaseReady && !!sessionUserId,
  });

  const snoozeToday = (alertId: string) => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    snoozeAlert(userId, alertId, endOfDay.toISOString())
      .then(() => {
        qc.invalidateQueries({ queryKey: ["deliveries", userId] });
        toast({ title: "Snoozed until tomorrow" });
      })
      .catch((e) => toast({ title: "Snooze failed", description: e.message, variant: "destructive" }));
  };

  const toggleRead = (alertId: string, read: boolean) => {
    markAlertRead(userId, alertId, read)
      .then(() => qc.invalidateQueries({ queryKey: ["deliveries", userId] }))
      .catch((e) => toast({ title: "Update failed", description: e.message, variant: "destructive" }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/40">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl">
            <Badge className="mb-3">PRD</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Alerting & Notification Platform
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              Create, manage, and deliver time-critical alerts across your organization. Admins craft alerts; users receive, snooze, and track them.
            </p>
          </div>

          {!supabaseReady && (
            <Card className="mt-8 p-4 border-destructive/40 bg-destructive/5">
              <h3 className="font-semibold mb-1">Supabase not connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect Supabase to persist alerts. Click Open MCP popover and connect to Supabase, then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project env.
              </p>
            </Card>
          )}

          <Tabs defaultValue="admin" className="mt-10">
            <TabsList>
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="enduser">End User</TabsTrigger>
            </TabsList>

            {alertsQuery.error && (
              <Card className="mt-4 p-4 border-destructive/40 bg-destructive/5">
                <div className="text-sm text-destructive-foreground">
                  Failed to load alerts: {(alertsQuery.error as any).message}
                </div>
              </Card>
            )}

            <TabsContent value="admin" className="mt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Severity</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
                  <DialogTrigger asChild>
                    <Button disabled={!supabaseReady}>Create Alert</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>{editing ? "Edit Alert" : "New Alert"}</DialogTitle>
                    </DialogHeader>
                    <AlertForm
                      initial={editing ?? undefined}
                      onSubmit={(values) => {
                        if (editing) updateMut.mutate({ id: editing.id, patch: values });
                        else createMut.mutate(values);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="mt-4">
                <div className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(alertsQuery.data ?? [])
                        .filter((a) => (filterSeverity === "all" ? true : a.severity === (filterSeverity as Severity)))
                        .map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div className="font-medium">{a.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">{a.message}</div>
                            </TableCell>
                            <TableCell>
                              <SeverityBadge s={a.severity} />
                            </TableCell>
                            <TableCell>
                              <span className="text-sm capitalize">{a.visibilityScope}</span>
                            </TableCell>
                            <TableCell>
                              {a.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button variant="outline" size="sm" onClick={() => { setEditing(a); setOpen(true); }}>Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => toggleMut.mutate({ id: a.id, active: !a.active })}>
                                {a.active ? "Disable" : "Enable"}
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(a.id)}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="enduser" className="mt-6">
              <Card>
                <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="team">Team</Label>
                    <Input id="team" placeholder="e.g., engineering" className="w-48" value={team} onChange={(e) => setTeam(e.target.value)} />
                  </div>
                  <div className="text-sm text-muted-foreground">User ID: {userId.slice(0, 8)}…</div>
                </div>
                <div className="p-4 pt-0 space-y-3">
                  {(visibleAlertsQuery.data ?? []).map((a) => {
                    const delivery = deliveriesQuery.data?.find((d) => d.alert_id === a.id);
                    const snoozed = delivery?.snoozed_until ? new Date(delivery.snoozed_until) > new Date() : false;
                    return (
                      <div key={a.id} className="rounded-lg border p-4 bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <SeverityBadge s={a.severity} />
                              <h3 className="font-semibold text-lg">{a.title}</h3>
                            </div>
                            <p className="text-muted-foreground mt-1 max-w-3xl">{a.message}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleRead(a.id, !(delivery?.read ?? false))}>
                              {(delivery?.read ?? false) ? "Mark Unread" : "Mark Read"}
                            </Button>
                            <Button variant="default" size="sm" onClick={() => snoozeToday(a.id)} disabled={snoozed}>
                              {snoozed ? "Snoozed" : "Snooze Today"}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Reminder every {a.reminderFrequencyHours}h · {a.visibilityScope.toUpperCase()} visibility
                        </div>
                      </div>
                    );
                  })}
                  {supabaseReady && (visibleAlertsQuery.data ?? []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No active alerts.</div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

function SeverityBadge({ s }: { s: Severity }) {
  const map: Record<Severity, string> = {
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${map[s]}`}>{s.toUpperCase()}</span>;
}

function AlertForm({ initial, onSubmit }: { initial?: Alert; onSubmit: (values: AlertInput) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [severity, setSeverity] = useState<Severity>(initial?.severity ?? "info");
  const [visibility, setVisibility] = useState<AlertInput["visibilityScope"]>(initial?.visibilityScope ?? "org");
  const [teams, setTeams] = useState<string>((initial?.teamIds ?? [])?.join(", ") ?? "");
  const [users, setUsers] = useState<string>((initial?.userIds ?? [])?.join(", ") ?? "");
  const [freq, setFreq] = useState<number>(initial?.reminderFrequencyHours ?? 2);
  const [expires, setExpires] = useState<string>(initial?.expiresAt ? initial.expiresAt.slice(0, 16) : "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setMessage(initial?.message ?? "");
    setSeverity(initial?.severity ?? "info");
    setVisibility(initial?.visibilityScope ?? "org");
    setTeams(((initial?.teamIds ?? []) as string[]).join(", "));
    setUsers(((initial?.userIds ?? []) as string[]).join(", "));
    setFreq(initial?.reminderFrequencyHours ?? 2);
    setExpires(initial?.expiresAt ? initial.expiresAt.slice(0, 16) : "");
    setActive(initial?.active ?? true);
  }, [initial?.id]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const values: AlertInput = {
          title,
          message,
          severity,
          visibilityScope: visibility,
          teamIds: visibility === "teams" ? teams.split(",").map((s) => s.trim()).filter(Boolean) : null,
          userIds: visibility === "users" ? users.split(",").map((s) => s.trim()).filter(Boolean) : null,
          reminderFrequencyHours: Number(freq) || 2,
          expiresAt: expires ? new Date(expires).toISOString() : null,
          active,
        };
        onSubmit(values);
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
            <SelectTrigger id="severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
            <SelectTrigger id="visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org">Entire Organization</SelectItem>
              <SelectItem value="teams">Specific Teams</SelectItem>
              <SelectItem value="users">Specific Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {visibility === "teams" && (
          <div className="space-y-2">
            <Label htmlFor="teams">Team IDs (comma-separated)</Label>
            <Input id="teams" placeholder="engineering, marketing" value={teams} onChange={(e) => setTeams(e.target.value)} />
          </div>
        )}
        {visibility === "users" && (
          <div className="space-y-2">
            <Label htmlFor="users">User IDs (comma-separated)</Label>
            <Input id="users" placeholder="uuid-1, uuid-2" value={users} onChange={(e) => setUsers(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="freq">Reminder (hours)</Label>
          <Input id="freq" type="number" min={1} step={1} value={freq} onChange={(e) => setFreq(parseInt(e.target.value, 10))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expires">Expires At</Label>
          <Input id="expires" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="active">Status</Label>
          <Select value={String(active)} onValueChange={(v) => setActive(v === "true") }>
            <SelectTrigger id="active">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pt-2 flex justify-end gap-2">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
