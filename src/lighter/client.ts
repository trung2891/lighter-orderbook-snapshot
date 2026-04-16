import EventEmitter from "node:events";
import WebSocket from "ws";

interface BookFrame {
  market: string;
  bids: [number, number][];
  asks: [number, number][];
  isSnapshot: boolean;
}

interface LighterClientOptions {
  wsUrl: string;
  channel: string;
  markets: string[];
  logger: {
    info: (msg: object, text?: string) => void;
    warn: (msg: object, text?: string) => void;
    error: (msg: object, text?: string) => void;
    debug: (msg: object, text?: string) => void;
  };
}

export class LighterClient extends EventEmitter {
  private readonly options: LighterClientOptions;
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private marketIdBySymbol = new Map<string, number>();
  private symbolByChannel = new Map<string, string>();

  constructor(options: LighterClientOptions) {
    super();
    this.options = options;
  }

  start() {
    this.isShuttingDown = false;
    this.connect();
  }

  stop() {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  private connect() {
    this.options.logger.info({ wsUrl: this.options.wsUrl }, "Connecting websocket");
    const ws = new WebSocket(this.options.wsUrl);
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectAttempt = 0;
      void this.subscribeAll();
    });

    ws.on("message", (buffer) => {
      this.handleMessage(buffer.toString());
    });

    ws.on("error", (error) => {
      this.options.logger.error({ err: error }, "Websocket error");
    });

    ws.on("close", () => {
      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      }
    });
  }

  private async subscribeAll() {
    for (const market of this.options.markets) {
      try {
        const marketId = await this.resolveMarketId(market);
        const channel = `${this.options.channel}/${marketId}`;
        const payload = {
          type: "subscribe",
          channel
        };
        this.symbolByChannel.set(`order_book:${marketId}`, market);
        this.ws?.send(JSON.stringify(payload));
        this.options.logger.info({ market, marketId, channel }, "Subscribed market");
      } catch (error) {
        this.options.logger.error({ market, err: error }, "Failed to subscribe market");
      }
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempt += 1;
    const delayMs = Math.min(30_000, 1_000 * 2 ** (this.reconnectAttempt - 1));
    this.options.logger.warn({ reconnectAttempt: this.reconnectAttempt, delayMs }, "Scheduling reconnect");
    this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
  }

  private handleMessage(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (data?.error) {
        this.options.logger.warn({ error: data.error }, "Websocket server error");
        return;
      }
      const frame = this.parseBookFrame(data);
      if (frame) {
        this.emit("book", frame);
        return;
      }
      this.options.logger.debug({ messageType: data?.type, keys: Object.keys(data ?? {}) }, "Ignoring non-orderbook frame");
    } catch (error) {
      this.options.logger.debug({ raw, err: error }, "Ignoring non-orderbook frame");
    }
  }

  private parseBookFrame(message: any): BookFrame | null {
    if (message?.order_book && typeof message?.channel === "string") {
      const market = this.symbolByChannel.get(message.channel) ?? message.channel;
      return {
        market,
        bids: (message.order_book.bids ?? [])
          .map((level: { price: string | number; size: string | number }) => [Number(level.price), Number(level.size)] as [number, number])
          .filter((level: [number, number]) => Number.isFinite(level[0]) && Number.isFinite(level[1])),
        asks: (message.order_book.asks ?? [])
          .map((level: { price: string | number; size: string | number }) => [Number(level.price), Number(level.size)] as [number, number])
          .filter((level: [number, number]) => Number.isFinite(level[0]) && Number.isFinite(level[1])),
        isSnapshot: message.type !== "update/order_book"
      };
    }

    const market = message.market ?? message.symbol ?? message.pair;
    const bids = message.bids ?? message.data?.bids;
    const asks = message.asks ?? message.data?.asks;

    if (!market || !Array.isArray(bids) || !Array.isArray(asks)) {
      return null;
    }

    const isSnapshot = Boolean(message.snapshot ?? message.type === "snapshot");

    return {
      market,
      bids: bids
        .map(this.normalizeLevel)
        .filter((item): item is [number, number] => item !== null),
      asks: asks
        .map(this.normalizeLevel)
        .filter((item): item is [number, number] => item !== null),
      isSnapshot
    };
  }

  private normalizeLevel(level: unknown): [number, number] | null {
    if (!Array.isArray(level) || level.length < 2) {
      return null;
    }

    const price = Number(level[0]);
    const size = Number(level[1]);
    if (!Number.isFinite(price) || !Number.isFinite(size)) {
      return null;
    }
    return [price, size];
  }

  private async resolveMarketId(symbol: string): Promise<number> {
    const cached = this.marketIdBySymbol.get(symbol);
    if (cached !== undefined) {
      return cached;
    }

    const wsUrl = new URL(this.options.wsUrl);
    const apiBase = `${wsUrl.protocol === "wss:" ? "https" : "http"}://${wsUrl.host}`;
    const response = await fetch(`${apiBase}/api/v1/orderBooks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch order books: ${response.status}`);
    }

    const payload = (await response.json()) as { order_books?: Array<{ symbol: string; market_id: number }> };
    const markets = payload.order_books ?? [];
    for (const item of markets) {
      this.marketIdBySymbol.set(item.symbol, item.market_id);
    }

    const marketId = this.marketIdBySymbol.get(symbol);
    if (marketId === undefined) {
      throw new Error(`Market not found: ${symbol}`);
    }
    return marketId;
  }
}
