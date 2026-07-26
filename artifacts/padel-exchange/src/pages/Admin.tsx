import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  adminLogin,
  useAdminRegistrations,
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useCreateRegistration,
  useDeleteRegistration,
  getAdminUsersQueryKey,
  getAdminRegistrationsQueryKey,
} from "@workspace/api-client-react";
import type { AdminUser } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Download, Lock, Search, Users, Shield, Plus, Trash2, Eye, EyeOff,
  BarChart3, TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string, user: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const result = await adminLogin(email.trim(), password);
      onLogin(result.token, result.user as AdminUser);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-1 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Add member dialog ────────────────────────────────────────────────────────

const SENIORITY_OPTIONS = ["C-Suite", "VP / Director", "Senior Manager", "Manager", "Associate", "Analyst", "Other"];
const PADEL_OPTIONS = ["Never played", "Beginner", "Intermediate", "Advanced", "Competitive"];
const INTEREST_OPTIONS = ["Networking", "Playing padel", "Hosting events", "Sponsorship", "Media & content", "Community building"];

function AddMemberDialog({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "", email: "", company: "", jobTitle: "",
    industry: "", function: "", seniority: "", padelLevel: "",
    linkedinUrl: "", interests: [] as string[],
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleInterest = (i: string) => setForm(f => ({
    ...f,
    interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
  }));

  const create = useCreateRegistration(token, {
    mutation: {
      onSuccess: () => {
        toast({ title: "Member added", description: `${form.fullName} is on the list.` });
        setOpen(false);
        setForm({ fullName: "", email: "", company: "", jobTitle: "", industry: "", function: "", seniority: "", padelLevel: "", linkedinUrl: "", interests: [] });
        onCreated();
      },
      onError: (e: any) => {
        toast({ title: "Error", description: e?.message ?? "Failed to add member", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ ...form, gdprConsent: true });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add member manually</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input placeholder="Full name *" value={form.fullName} onChange={e => set("fullName", e.target.value)} required />
            </div>
            <div className="col-span-2">
              <Input type="email" placeholder="Email *" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>
            <Input placeholder="Company" value={form.company} onChange={e => set("company", e.target.value)} />
            <Input placeholder="Job title" value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} />
            <Input placeholder="Industry" value={form.industry} onChange={e => set("industry", e.target.value)} />
            <Input placeholder="Function" value={form.function} onChange={e => set("function", e.target.value)} />
            <Select value={form.seniority} onValueChange={v => set("seniority", v)}>
              <SelectTrigger><SelectValue placeholder="Seniority" /></SelectTrigger>
              <SelectContent>{SENIORITY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.padelLevel} onValueChange={v => set("padelLevel", v)}>
              <SelectTrigger><SelectValue placeholder="Padel level" /></SelectTrigger>
              <SelectContent>{PADEL_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
            <div className="col-span-2">
              <Input placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(i => (
                <button key={i} type="button"
                  onClick={() => toggleInterest(i)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.interests.includes(i)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending || !form.fullName || !form.email}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add to list
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: registrations, isLoading } = useAdminRegistrations(token);

  const deleteReg = useDeleteRegistration(token, {
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminRegistrationsQueryKey(token) });
        toast({ title: "Member removed" });
      },
      onError: (e: any) => {
        toast({ title: "Error", description: e?.message ?? "Failed to remove member", variant: "destructive" });
      },
    },
  });

  const filtered = (registrations ?? []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company ?? "").toLowerCase().includes(q) ||
      (r.jobTitle ?? "").toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    fetch(`/api/admin/registrations/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "members.csv"; a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-muted-foreground text-sm">
          {registrations ? `${registrations.length} on the list` : "Loading…"}
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name, email, company…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <AddMemberDialog
            token={token}
            onCreated={() => qc.invalidateQueries({ queryKey: getAdminRegistrationsQueryKey(token) })}
          />
          <Button onClick={handleExport} disabled={!registrations?.length} size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Joined</TableHead>
                  <TableHead>Name & Contact</TableHead>
                  <TableHead>Professional</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Interests</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {search ? "No results." : "No members yet."}
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.fullName}</div>
                      <div className="text-sm text-muted-foreground">{r.email}</div>
                      {r.linkedinUrl && (
                        <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-0.5 inline-block">
                          LinkedIn ↗
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.company || "—"}</div>
                      <div className="text-sm text-muted-foreground">
                        {[r.jobTitle, r.seniority, r.function].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {r.industry && (
                        <Badge variant="outline" className="mt-1 text-xs">{r.industry}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {r.padelLevel || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {r.interests?.map((i, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] py-0">{i}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteReg.isPending}
                        onClick={() => {
                          if (confirm(`Remove ${r.fullName} from the list? This cannot be undone.`)) {
                            deleteReg.mutate({ id: r.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invite dialog ────────────────────────────────────────────────────────────

function InviteDialog({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();

  const create = useCreateAdminUser(token, {
    mutation: {
      onSuccess: () => {
        toast({ title: "Admin account created", description: `${name} can now sign in.` });
        setOpen(false);
        setName(""); setEmail(""); setPassword(""); setRole("admin");
        onCreated();
      },
      onError: (e: any) => {
        toast({ title: "Error", description: e?.message ?? "Failed to create account", variant: "destructive" });
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create admin account</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => { e.preventDefault(); create.mutate({ name, email, password, role }); }}
          className="space-y-4 pt-2"
        >
          <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required minLength={8}
              className="pr-10"
            />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Select value={role} onValueChange={v => setRole(v as "admin" | "superadmin")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin — can manage events and members</SelectItem>
              <SelectItem value="superadmin">Superadmin — can also manage admin accounts</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={create.isPending || !name || !email || password.length < 8}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Insights tab ─────────────────────────────────────────────────────────────

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

interface InsightsData {
  totals: { registrations: number; withMemberAccount: number; consentEvents: number; consentMarketing: number; consentSponsor: number; withUtm: number };
  consentRates: { events: number; marketing: number; sponsor: number };
  byIndustry:   { label: string; value: number }[];
  bySeniority:  { label: string; value: number }[];
  byFunction:   { label: string; value: number }[];
  byPadelLevel: { label: string; value: number }[];
  utmSources:   { label: string; value: number }[];
  utmCampaigns: { label: string; value: number }[];
  weeklySignups:{ week: string; value: number }[];
}

function Bar({ value, max, colour = "bg-primary" }: { value: number; max: number; colour?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className={`${colour} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8 text-right">{value}</span>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2.5">
        {rows.slice(0, 8).map(r => (
          <div key={r.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground truncate max-w-[70%]">{r.label}</span>
            </div>
            <Bar value={r.value} max={max} />
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
      </CardContent>
    </Card>
  );
}

function InsightsTab({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery<InsightsData>({
    queryKey: ["admin-insights", token],
    queryFn: async () => {
      const r = await fetch(`${BASE()}/api/admin/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to load insights");
      return r.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (error || !data) return (
    <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground text-sm">
      Failed to load insights — {(error as any)?.message}
    </div>
  );

  const { totals, consentRates } = data;
  const pct = (n: number) => totals.registrations > 0
    ? Math.round((n / totals.registrations) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total registrations", value: totals.registrations },
          { label: "Member accounts",     value: `${totals.withMemberAccount} (${pct(totals.withMemberAccount)}%)` },
          { label: "Events consent",       value: `${totals.consentEvents} (${consentRates.events ?? 0}%)` },
          { label: "Marketing consent",    value: `${totals.consentMarketing} (${consentRates.marketing ?? 0}%)` },
          { label: "Sponsor consent",      value: `${totals.consentSponsor} (${consentRates.sponsor ?? 0}%)` },
          { label: "With UTM source",      value: `${totals.withUtm} (${pct(totals.withUtm)}%)` },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly signups chart (simple bar) */}
      {data.weeklySignups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly signups (last 12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-24">
              {data.weeklySignups.map(w => {
                const maxW = Math.max(...data.weeklySignups.map(x => x.value), 1);
                const h = Math.round((w.value / maxW) * 100);
                return (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">{w.value}</span>
                    <div
                      className="w-full bg-primary/80 rounded-t-sm"
                      style={{ height: `${h}%`, minHeight: "2px" }}
                    />
                    <span className="text-[9px] text-muted-foreground rotate-45 origin-left translate-y-2">
                      {w.week.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segmentation grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <BreakdownCard title="Industry"     rows={data.byIndustry} />
        <BreakdownCard title="Seniority"    rows={data.bySeniority} />
        <BreakdownCard title="Function"     rows={data.byFunction} />
        <BreakdownCard title="Padel level"  rows={data.byPadelLevel} />
      </div>

      {/* Attribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownCard title="UTM source"   rows={data.utmSources} />
        <BreakdownCard title="UTM campaign" rows={data.utmCampaigns.length ? data.utmCampaigns : []} />
      </div>
    </div>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab({ token, currentUserId }: { token: string; currentUserId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users, isLoading } = useAdminUsers(token);

  const deleteUser = useDeleteAdminUser(token, {
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminUsersQueryKey(token) });
        toast({ title: "Account removed" });
      },
      onError: (e: any) => {
        toast({ title: "Error", description: e?.message ?? "Failed to remove account", variant: "destructive" });
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground text-sm">
          {users ? `${users.length} admin ${users.length === 1 ? "account" : "accounts"}` : "Loading…"}
        </p>
        <InviteDialog token={token} onCreated={() => qc.invalidateQueries({ queryKey: getAdminUsersQueryKey(token) })} />
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map(u => (
                <TableRow key={u.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "superadmin" ? "default" : "secondary"}
                      className={u.role === "superadmin" ? "bg-primary" : ""}
                    >
                      {u.role === "superadmin" ? "Superadmin" : "Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteUser.isPending}
                        onClick={() => {
                          if (confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) {
                            deleteUser.mutate({ id: u.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Main admin panel ─────────────────────────────────────────────────────────

type Tab = "members" | "insights" | "team";

function AdminPanel({ token, user, onLock }: { token: string; user: AdminUser; onLock: () => void }) {
  const [tab, setTab] = useState<Tab>("members");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-foreground hover:text-primary transition-colors">
              P³
            </Link>
            <span className="text-muted-foreground text-sm font-medium border-l border-border pl-4">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
            <Button variant="outline" size="sm" onClick={onLock}>
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tab nav */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              {tab === "members" ? "Members" : tab === "insights" ? "Insights" : "Team"}
            </h1>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit border border-border">
              <button
                onClick={() => setTab("members")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === "members"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Members
              </button>
              <button
                onClick={() => setTab("insights")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === "insights"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Insights
              </button>
              {user.role === "superadmin" && (
                <button
                  onClick={() => setTab("team")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tab === "team"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Team
                </button>
              )}
            </div>
          </div>
        </div>

        {tab === "members"  && <MembersTab token={token} />}
        {tab === "insights" && <InsightsTab token={token} />}
        {tab === "team"     && user.role === "superadmin" && (
          <TeamTab token={token} currentUserId={user.id} />
        )}
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const [session, setSession] = useState<{ token: string; user: AdminUser } | null>(null);

  if (!session) {
    return <LoginScreen onLogin={(token, user) => setSession({ token, user })} />;
  }

  return (
    <AdminPanel
      token={session.token}
      user={session.user}
      onLock={() => setSession(null)}
    />
  );
}
