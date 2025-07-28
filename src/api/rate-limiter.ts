import { RateLimitConfig } from "@/types";
import { RateLimitState } from "./types";

export class RateLimiter {
  private state: RateLimitState;

  constructor(private config: RateLimitConfig) {
    this.state = {
      requests: 0,
      windowStart: Date.now(),
      nextReset: Date.now() + config.window,
    };
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Reset window if it has expired
    if (now >= this.state.nextReset) {
      this.resetWindow(now);
    }

    // Check if we're within the rate limit
    if (this.state.requests < this.config.requests) {
      this.state.requests++;
      return;
    }

    // We've hit the rate limit, wait until the window resets
    const waitTime = this.state.nextReset - now;
    if (waitTime > 0) {
      await this.sleep(waitTime);
    }

    // Reset window and allow the request
    this.resetWindow(Date.now());
    this.state.requests++;
  }

  getState(): RateLimitState {
    return { ...this.state };
  }

  getRemainingRequests(): number {
    const now = Date.now();

    // If window has expired, return full quota
    if (now >= this.state.nextReset) {
      return this.config.requests;
    }

    return Math.max(0, this.config.requests - this.state.requests);
  }

  getTimeToReset(): number {
    const now = Date.now();
    return Math.max(0, this.state.nextReset - now);
  }

  private resetWindow(now: number): void {
    if (this.config.strategy === "sliding") {
      // For sliding window, we need more sophisticated logic
      // For simplicity, we'll implement fixed window here
      this.state.requests = 0;
      this.state.windowStart = now;
      this.state.nextReset = now + this.config.window;
    } else {
      // Fixed window
      this.state.requests = 0;
      this.state.windowStart = now;
      this.state.nextReset = now + this.config.window;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
