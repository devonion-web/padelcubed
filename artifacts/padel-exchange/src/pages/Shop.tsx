import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ShoppingBag, Loader2, CheckCircle2, XCircle, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  metadata: Record<string, string>;
  price: {
    id: string;
    unitAmount: number;
    currency: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(unitAmount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(unitAmount / 100);
}

const SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"];

// Local fallback image for all P³ products until individual shots are added to Stripe
const P3_APPAREL_IMG = `${import.meta.env.BASE_URL}apparel/p3-apparel.png`;

function ProductPlaceholder() {
  return (
    <img
      src={P3_APPAREL_IMG}
      alt="P³ apparel"
      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
    />
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onBuy }: { product: ShopProduct; onBuy: (p: ShopProduct) => void }) {
  const [imgError, setImgError] = useState(false);
  const sizesRaw = product.metadata.sizes ?? "";
  const sizes = sizesRaw ? sizesRaw.split(",").map((s) => s.trim()) : [];
  const isSingleSize = sizes.length === 1 && sizes[0] === "One Size";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
      {/* Product image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.images?.[0] && !imgError ? (
          <img
            src={product.images[0]}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <ProductPlaceholder />
        )}
        {/* Size badge */}
        {!isSingleSize && sizes.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
            {sizes.map((s) => (
              <span
                key={s}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border text-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="font-bold text-foreground text-lg leading-tight">{product.name}</h3>
          {isSingleSize && (
            <span className="text-xs text-muted-foreground font-medium">One Size</span>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          {product.price ? (
            <span className="text-xl font-bold text-foreground">
              {formatPrice(product.price.unitAmount, product.price.currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Price unavailable</span>
          )}
          <Button
            onClick={() => product.price && onBuy(product)}
            disabled={!product.price}
            size="sm"
            className="gap-1.5"
          >
            Buy <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout dialog ──────────────────────────────────────────────────────────

function CheckoutDialog({
  product,
  onClose,
}: {
  product: ShopProduct | null;
  onClose: () => void;
}) {
  const [size, setSize] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizes = product?.metadata.sizes
    ? product.metadata.sizes.split(",").map((s) => s.trim())
    : [];
  const isSingleSize = sizes.length === 1 && sizes[0] === "One Size";

  // Reset state when dialog opens for a new product
  useEffect(() => {
    if (product) {
      setSize(isSingleSize ? "One Size" : "");
      setError(null);
    }
  }, [product]);

  async function handleCheckout() {
    if (!product?.price) return;
    if (!isSingleSize && !size) {
      setError("Please select a size before continuing.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: product.price.id, size: isSingleSize ? undefined : size }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
          {product?.price && (
            <DialogDescription className="text-base font-semibold text-foreground">
              {formatPrice(product.price.unitAmount, product.price.currency)}
            </DialogDescription>
          )}
        </DialogHeader>

        {!isSingleSize && sizes.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Choose your size</p>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSize(s); setError(null); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    size === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button onClick={handleCheckout} disabled={loading} className="w-full gap-2">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
          ) : (
            <>Checkout securely <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Powered by Stripe · Secure payment
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Shop() {
  const [location] = useLocation();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const orderStatus = params.get("order"); // 'success' | 'cancelled' | null

  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

  const { data, isLoading, isError } = useQuery<{ products: ShopProduct[] }>({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const r = await fetch("/api/shop/products");
      if (!r.ok) throw new Error("Failed to load shop");
      return r.json();
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="pc-logo" aria-label="P Cubed" />
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#events" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Events
            </Link>
            <Link href="/host-an-event" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Host an event
            </Link>
            <Link href="/shop" className="text-sm font-medium text-foreground transition-colors">
              Shop
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-24">
        <div className="max-w-6xl mx-auto px-6">

          {/* ── Order status banner ───────────────────────────────────────── */}
          {orderStatus === "success" && (
            <div className="mb-8 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-300">Order confirmed — thank you!</p>
                <p className="text-sm text-green-400/80">
                  You'll receive a confirmation email from Stripe shortly. We'll be in touch with shipping details.
                </p>
              </div>
            </div>
          )}
          {orderStatus === "cancelled" && (
            <div className="mb-8 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
              <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">Checkout was cancelled — no charge was made.</p>
            </div>
          )}

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-12 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Tag className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">P³ Apparel</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Wear the Exchange
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Premium P³ branded kit for on court and off. Designed for people who play the game and mean it.
            </p>
          </div>

          {/* ── Product grid ─────────────────────────────────────────────── */}
          {isLoading && (
            <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading products…</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center py-24">
              <p className="text-destructive">Failed to load products. Please try again later.</p>
            </div>
          )}

          {!isLoading && !isError && data?.products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-muted-foreground">No products yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Check back soon — kit drops incoming.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !isError && (data?.products.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data!.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onBuy={setSelectedProduct}
                />
              ))}
            </div>
          )}

          {/* ── Info strip ───────────────────────────────────────────────── */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: "Free UK shipping", body: "On all orders over £50." },
              { title: "Secure checkout", body: "Powered by Stripe. Cards accepted worldwide." },
              { title: "Questions?", body: "Email info@padelcubed.co.uk and we'll sort it." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border/60 bg-card/40 p-5">
                <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Checkout dialog ───────────────────────────────────────────────── */}
      <CheckoutDialog
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
