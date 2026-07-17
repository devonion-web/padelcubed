import { useState } from "react";
import { Link } from "wouter";
import { useListRegistrations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Lock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: registrations, isLoading, isError, error } = useListRegistrations(
    { adminPassword: password },
    {
      query: {
        enabled: isAuthenticated,
        retry: false,
      },
    }
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setIsAuthenticated(true);
    }
  };

  const handleExport = () => {
    const url = `/api/admin/registrations/export?adminPassword=${encodeURIComponent(password)}`;
    window.open(url, '_blank');
  };

  if (!isAuthenticated || (isError && (error as any)?.status === 401)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md bg-card border-border shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl font-bold tracking-tight">Admin Access</CardTitle>
            <CardDescription className="text-center">
              Enter the admin password to view registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (isError) setIsAuthenticated(false);
                  }}
                  className="bg-background"
                  autoFocus
                />
                {isError && (
                  <p className="text-sm text-destructive font-medium mt-1">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={!password.trim()}>
                Enter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredRegistrations = registrations?.filter((reg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reg.fullName.toLowerCase().includes(query) ||
      reg.email.toLowerCase().includes(query) ||
      (reg.company && reg.company.toLowerCase().includes(query)) ||
      (reg.jobTitle && reg.jobTitle.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-foreground hover:text-primary transition-colors">
              The Padel Exchange
            </Link>
            <span className="text-muted-foreground text-sm font-medium border-l border-border pl-4">
              Admin Panel
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsAuthenticated(false);
              setPassword("");
            }}
          >
            Lock
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Registrations</h1>
            <p className="text-muted-foreground">
              {registrations ? `${registrations.length} founders on the list.` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, email, company..."
                className="pl-9 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleExport} disabled={!registrations || registrations.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading registrations...</p>
            </div>
          </div>
        ) : !registrations || registrations.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">No registrations yet</p>
              <p className="text-sm text-muted-foreground">When founders sign up, they will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name & Contact</TableHead>
                    <TableHead>Professional</TableHead>
                    <TableHead>Padel Level</TableHead>
                    <TableHead>Interests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations?.map((reg) => (
                    <TableRow key={reg.id} className="hover:bg-muted/20">
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {format(new Date(reg.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{reg.fullName}</div>
                        <div className="text-sm text-muted-foreground">{reg.email}</div>
                        {reg.linkedinUrl && (
                          <a 
                            href={reg.linkedinUrl} 
                            target="_blank" 
                            rel="norenoopener noreferrer"
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            LinkedIn
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{reg.company || "—"}</div>
                        <div className="text-sm text-muted-foreground">
                          {[reg.jobTitle, reg.seniority, reg.function].filter(Boolean).join(" • ") || "—"}
                        </div>
                        {reg.industry && (
                          <Badge variant="outline" className="mt-1 text-xs bg-background">
                            {reg.industry}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className="bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {reg.padelLevel || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {reg.interests?.map((interest, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRegistrations?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No registrations match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
