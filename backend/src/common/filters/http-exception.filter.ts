import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException
      ? exception.getResponse()
      : "Internal server error";

    // 记录非 HttpException 错误（500 错误）
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // 记录 4xx 客户端错误（可选，用于调试）
    if (exception instanceof HttpException && status >= 400 && status < 500) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${typeof message === "string" ? message : (message as any).message || message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: typeof message === "string" ? message : (message as any).message || message,
      timestamp: new Date().toISOString(),
    });
  }
}
