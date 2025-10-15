import { WebSocketServer, WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { createLogger } from '@fareplay/utils';

const logger = createLogger('ws:broadcaster');

export type EventType = 
  | 'bet.placed'
  | 'bet.settled'
  | 'jackpot.won'
  | 'player.joined'
  | 'stats.updated'
  | 'chat.message';

export interface CasinoEvent {
  type: EventType;
  data: any;
  timestamp: number;
}

export class EventBroadcaster {
  private wss: WebSocketServer;
  private redis: Redis;
  private readonly CHANNEL = 'casino:events';

  constructor(wss: WebSocketServer, redis: Redis) {
    this.wss = wss;
    this.redis = redis;
  }

  async start(): Promise<void> {
    // Subscribe to Redis channel
    await this.redis.subscribe(this.CHANNEL);
    
    this.redis.on('message', (channel: string, message: string) => {
      if (channel === this.CHANNEL) {
        try {
          const event = JSON.parse(message) as CasinoEvent;
          this.broadcast(event);
        } catch (error) {
          logger.error({ error }, 'Error parsing event message');
        }
      }
    });

    logger.info(`Subscribed to Redis channel: ${this.CHANNEL}`);
  }

  /**
   * Broadcasts an event to all connected clients
   */
  broadcast(event: CasinoEvent): void {
    const message = JSON.stringify(event);
    let sentCount = 0;

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          logger.error({ error }, 'Error sending message to client');
        }
      }
    });

    logger.debug(
      { type: event.type, clients: sentCount },
      'Event broadcasted'
    );
  }

  /**
   * Broadcasts an event to specific clients matching a filter
   */
  broadcastToFiltered(
    event: CasinoEvent,
    filter: (client: any) => boolean
  ): void {
    const message = JSON.stringify(event);
    let sentCount = 0;

    this.wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && filter(client)) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          logger.error({ error }, 'Error sending message to client');
        }
      }
    });

    logger.debug(
      { type: event.type, clients: sentCount },
      'Filtered event broadcasted'
    );
  }

  /**
   * Gets the number of connected clients
   */
  getClientCount(): number {
    return this.wss.clients.size;
  }
}

