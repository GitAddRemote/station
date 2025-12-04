import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class UEXServerException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_GATEWAY);
  }
}

export class UEXClientException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
