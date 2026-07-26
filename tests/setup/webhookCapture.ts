/**
 * Local webhook capture server.
 *
 * Starts a tiny HTTP server that records every inbound POST request.
 * Tests can:
 *  - await server.start()  → get the URL to pass as WEBHOOK_URL
 *  - server.setMode('accept' | 'reject')  → control response code
 *  - server.requests()  → read captured request bodies / headers
 *  - server.reset()     → clear captures
 *  - await server.stop()
 *
 * The server verifies the X-P3-Signature HMAC when WEBHOOK_SECRET is set.
 */

import http from "http";
import { createHmac } from "crypto";

export type CaptureMode = "accept" | "reject";

export interface CapturedRequest {
  body:    Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  signature: string | undefined;
  signatureValid: boolean;
}

export class WebhookCaptureServer {
  private server:   http.Server;
  private mode:     CaptureMode = "accept";
  private captured: CapturedRequest[] = [];
  private port = 0;

  constructor() {
    this.server = http.createServer((req, res) => this.handle(req, res));
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw  = Buffer.concat(chunks).toString("utf8");
      const body = JSON.parse(raw || "{}") as Record<string, unknown>;
      const sig  = req.headers["x-p3-signature"] as string | undefined;

      let signatureValid = false;
      const secret = process.env.WEBHOOK_SECRET;
      if (sig && secret) {
        const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        signatureValid = sig === expected;
      }

      this.captured.push({ body, headers: req.headers as Record<string, string | string[] | undefined>, signature: sig, signatureValid });

      if (this.mode === "accept") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Service unavailable" }));
      }
    });
  }

  async start(): Promise<string> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, "127.0.0.1", resolve),
    );
    this.port = (this.server.address() as { port: number }).port;
    return `http://127.0.0.1:${this.port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      this.server.close((err) => (err ? reject(err) : resolve())),
    );
  }

  setMode(mode: CaptureMode): void { this.mode = mode; }
  requests(): CapturedRequest[]    { return [...this.captured]; }
  reset(): void                    { this.captured = []; }
  lastRequest(): CapturedRequest | undefined { return this.captured[this.captured.length - 1]; }
}
