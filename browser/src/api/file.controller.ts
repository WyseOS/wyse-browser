/// <reference types="multer" />

import {
    Controller,
    Get,
    Post,
    Delete,
    Head,
    Param,
    Res,
    HttpStatus,
    UseInterceptors,
    UploadedFiles,
    Body
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Response as ExpressResponse } from 'express';
import { FileApiService } from './file.service';
import { FILE_CONSTANTS } from '../constants';
import { createReadStream } from 'fs';
import { Runtime } from '../runtime';

type MulterFile = Express.Multer.File;

@Controller('api')
export class FileController {
    constructor(
        private readonly fileApiService: FileApiService,
        private readonly runtime: Runtime
    ) { }

    @Post("/session/:sessionId/files")
    @UseInterceptors(AnyFilesInterceptor({
        limits: {
            fileSize: FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION,
        },
    }))
    async uploadFile(
        @Param("sessionId") sessionId: string,
        @UploadedFiles() files: MulterFile[],
        @Body() body: any,
        @Res() res: ExpressResponse
    ) {
        try {
            if (files && files.length > 0) {
                const file = files[0];
                const filePath = body.path || file.originalname || 'uploaded-file';
                const stream = createReadStream(file.path);

                const response = await this.fileApiService.handleFileUpload(sessionId, filePath, stream);
                return res.status(HttpStatus.OK).json(response);
            }

            if (body.file && typeof body.file === 'string') {
                return res.status(HttpStatus.NOT_IMPLEMENTED).json({
                    success: false,
                    message: 'URL download not implemented yet'
                });
            }

            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'No file provided'
            });

        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to upload file'
            });
        }
    }

    @Get("/session/:sessionId/files")
    async listFiles(
        @Param("sessionId") sessionId: string,
        @Res() res: ExpressResponse
    ) {
        try {
            const session = this.runtime.getSession(sessionId);

            if (!session) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            const fileCount = session.getDownloadedFileCount();

            if (fileCount === 0) {
                return res.status(HttpStatus.OK).json({
                    data: []
                });
            }

            const response = await this.fileApiService.handleFileList(sessionId);
            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to list files'
            });
        }
    }

    @Get("/session/:sessionId/files/*")
    async downloadFile(
        @Param("sessionId") sessionId: string,
        @Param("*") filePath: string,
        @Res() res: ExpressResponse
    ) {
        try {
            const { stream, headers } = await this.fileApiService.handleFileDownload(sessionId, filePath);

            Object.entries(headers).forEach(([key, value]) => {
                res.header(key, value);
            });

            return stream.pipe(res);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to download file'
            });
        }
    }

    @Head("/session/:sessionId/files/*")
    async headFile(
        @Param("sessionId") sessionId: string,
        @Param("*") filePath: string,
        @Res() res: ExpressResponse
    ) {
        try {
            const headers = await this.fileApiService.handleFileHead(sessionId, filePath);

            Object.entries(headers).forEach(([key, value]) => {
                res.header(key, value);
            });

            return res.status(HttpStatus.OK).send();
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get file metadata'
            });
        }
    }


    @Delete("/session/:sessionId/files/*")
    async deleteFile(
        @Param("sessionId") sessionId: string,
        @Param("*") filePath: string,
        @Res() res: ExpressResponse
    ) {
        try {
            await this.fileApiService.handleFileDelete(sessionId, filePath);
            return res.status(HttpStatus.NO_CONTENT).send();
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to delete file'
            });
        }
    }

    @Delete("/session/:sessionId/files")
    async deleteAllFiles(
        @Param("sessionId") sessionId: string,
        @Res() res: ExpressResponse
    ) {
        try {
            await this.fileApiService.handleFileDeleteAll(sessionId);
            return res.status(HttpStatus.NO_CONTENT).send();
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to delete all files'
            });
        }
    }
}
