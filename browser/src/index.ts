import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { AllExceptionsFilter } from '@/api/filter/all-exception.filter';
import { HttpExceptionsFilter } from '@/api/filter/http-exception.filter';
import { ValidationExceptionFilter } from '@/api/filter/validation-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);

  // Configure global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: false,
    validationError: {
      target: false,
    },
  }));

  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new HttpExceptionsFilter(),
    new AllExceptionsFilter()
  );
  await app.listen(process.env.PORT ?? 13100);
}

bootstrap();
