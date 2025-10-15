import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { createLogger } from '@fareplay/utils';
import { EventBroadcaster } from './broadcaster.js';

const logger = createLogger('ws:connection');

interface ClientData {
  id: string;
  connectedAt: number;
  lastPing: number;
  authenticated: boolean;
  walletAddress?: string;
}

export function handleConnection(
  ws: WebSocket,
  request: IncomingMessage,
  broadcaster: EventBroadcaster
): void {
  const clientId = generateClientId();
  
  const clientData: ClientData = {
    id: clientId,
    connectedAt: Date.now(),
    lastPing: Date.now(),
    authenticated: false,
  };

  // Attach client data to WebSocket
  (ws as any).clientData = clientData;

  logger.info({ clientId, ip: request.socket.remoteAddress }, 'Client connected');

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection.established',
    data: {
      clientId,
      timestamp: Date.now(),
    },
  }));

  // Handle messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleClientMessage(ws, message, broadcaster);
    } catch (error) {
      logger.error({ error, clientId }, 'Error parsing client message');
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' },
      }));
    }
  });

  // Handle pong (keep-alive)
  ws.on('pong', () => {
    clientData.lastPing = Date.now();
  });

  // Handle client disconnect
  ws.on('close', () => {
    logger.info({ clientId }, 'Client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error({ error, clientId }, 'WebSocket error');
  });

  // Set up ping interval (keep-alive)
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      // Check if client is still responsive
      const timeSinceLastPing = Date.now() - clientData.lastPing;
      if (timeSinceLastPing > 60000) { // 60 seconds
        logger.warn({ clientId }, 'Client unresponsive, closing connection');
        ws.close();
        clearInterval(pingInterval);
      } else {
        ws.ping();
      }
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Ping every 30 seconds
}

function handleClientMessage(
  ws: WebSocket,
  message: any,
  broadcaster: EventBroadcaster
): void {
  const clientData = (ws as any).clientData as ClientData;

  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        data: { timestamp: Date.now() },
      }));
      break;

    case 'subscribe':
      // Handle subscription to specific event types
      logger.debug({ clientId: clientData.id, channels: message.channels }, 'Client subscribed');
      ws.send(JSON.stringify({
        type: 'subscribed',
        data: { channels: message.channels || ['all'] },
      }));
      break;

    case 'unsubscribe':
      // Handle unsubscription
      logger.debug({ clientId: clientData.id, channels: message.channels }, 'Client unsubscribed');
      break;

    case 'chat.send':
      // Handle chat messages (would need authentication)
      if (!clientData.authenticated) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Authentication required' },
        }));
        return;
      }
      // Process chat message...
      break;

    default:
      logger.warn({ clientId: clientData.id, type: message.type }, 'Unknown message type');
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Unknown message type' },
      }));
  }
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


