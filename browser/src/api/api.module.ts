import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { CorsMiddleware } from './cors.middleware';
import { LoggerMiddleware } from './logger.middleware';
import { FileModule } from './file.module';
import { CoreModule } from './core.module';

@Module({
  imports: [CoreModule, FileModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddleware, LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
