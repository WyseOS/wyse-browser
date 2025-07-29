import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { Runtime } from '../runtime';
import { CorsMiddleware } from './cors.middleware';
import { LoggerMiddleware } from './logger.middleware';

@Module({
  imports: [],
  controllers: [ApiController],
  providers: [ApiService, Runtime],
})
export class ApiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddleware, LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
