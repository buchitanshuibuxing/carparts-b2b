
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'import' })
export class ImportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ImportGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { sourceId: number }) {
    client.join(`import-${data.sourceId}`);
    return { event: 'subscribed', data: { sourceId: data.sourceId } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { sourceId: number }) {
    client.leave(`import-${data.sourceId}`);
    return { event: 'unsubscribed', data: { sourceId: data.sourceId } };
  }

  emitProgress(sourceId: number, progress: any) {
    this.server.to(`import-${sourceId}`).emit('progress', { sourceId, ...progress, timestamp: new Date().toISOString() });
  }

  emitComplete(sourceId: number, result: { imported: number; skipped: number; errors: number }) {
    this.server.to(`import-${sourceId}`).emit('complete', { sourceId, ...result, timestamp: new Date().toISOString() });
  }

  emitError(sourceId: number, error: string) {
    this.server.to(`import-${sourceId}`).emit('error', { sourceId, message: error, timestamp: new Date().toISOString() });
  }
}
