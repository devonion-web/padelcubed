import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  adminLogin,
  useAdminRegistrations,
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
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
} from "lucide-react";
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

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const { data: registrations, isLoading } = useAdminRegistrations(token);

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
    window.open(`/api/admin/registrations/export?adminPassword=_jwt_&token=${encodeURIComponent(token)}`, "_blank");
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
          <Button onClick={handleExport} disabled={!registrations?.length} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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

type Tab = "members" | "team";

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
              {tab === "members" ? "Members" : "Team"}
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

        {tab === "members" && <MembersTab token={token} />}
        {tab === "team" && user.role === "superadmin" && (
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
