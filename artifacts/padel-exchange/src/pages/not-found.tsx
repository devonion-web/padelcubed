import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 py-12">
      <div className="text-center">
        <h1 className="text-9xl font-bold tracking-tight text-primary">404</h1>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}
