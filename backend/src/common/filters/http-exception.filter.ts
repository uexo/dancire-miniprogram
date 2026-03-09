// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // 构建统一错误响应格式
    let errorResponse: any = {
      success: false,
      message: '服务器错误',
      code: 'UNKNOWN_ERROR'
    };

    if (typeof exceptionResponse === 'string') {
      errorResponse.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      errorResponse = {
        ...errorResponse,
        ...exceptionResponse
      };
    }

    // 开发环境添加详细错误信息
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = exception.stack;
      errorResponse.path = request.url;
    }

    // 如果是未认证错误，保持原始响应格式
    if (status === HttpStatus.UNAUTHORIZED && exceptionResponse['code']) {
      return response.status(status).json(exceptionResponse);
    }

    response.status(status).json(errorResponse);
  }
}

// 全局未捕获异常过滤器
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    console.error('未捕获的异常:', exception);

    const errorResponse: any = {
      success: false,
      message: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = exception;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}
