import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileController } from './file.controller';
import { FileApiService } from './file.service';
import { FILE_CONSTANTS } from '../constants';

@Module({
    imports: [
        MulterModule.register({
            limits: {
                fileSize: FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION,
            },
            dest: FILE_CONSTANTS.UPLOAD_TEMP_DIR,
        }),
    ],
    controllers: [FileController],
    providers: [FileApiService],
    exports: [FileApiService],
})
export class FileModule { }
