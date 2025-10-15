import { Connection, ConnectionConfig } from '@solana/web3.js';
import { config } from '@fareplay/utils';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    const connectionConfig: ConnectionConfig = {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    };

    connection = new Connection(config.solanaRpcUrl, connectionConfig);
  }

  return connection;
}

export { Connection };


