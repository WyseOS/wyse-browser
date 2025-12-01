import { Global, Module } from '@nestjs/common';
import { Runtime } from '../runtime';

/**
 * Core module that provides singleton instances shared across the application.
 * Marked as @Global() so Runtime can be injected anywhere without importing this module.
 */
@Global()
@Module({
    providers: [Runtime],
    exports: [Runtime],
})
export class CoreModule { }

