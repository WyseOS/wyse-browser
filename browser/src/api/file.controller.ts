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

interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    path: string;
    filename: string;
}

@Controller('api')
export class FileController {
    constructor(private readonly fileApiService: FileApiService) { }

    @Post("/sessions/:sessionId/files")
    @UseInterceptors(AnyFilesInterceptor({
        limits: {
            fileSize: FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION,
        },
    }))
    async uploadFile(
        @Param("sessionId") sessionId: string,
        @UploadedFiles() files: UploadedFile[],
        @Body() body: any,
        @Res() res: ExpressResponse
    ) {
        try {
            // Validate session storage limit
            const currentSessionSize = await this.fileApiService.getSessionStorageSize(sessionId);
            const newFilesSize = files.reduce((total, file) => total + file.size, 0);

            if (currentSessionSize + newFilesSize > FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION) {
                return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
                    success: false,
                    message: `Session storage limit exceeded. Maximum: ${FILE_CONSTANTS.MAX_FILE_SIZE_PER_SESSION / (1024 * 1024)}MB`
                });
            }

            // Process file upload
            if (files && files.length > 0) {
                const file = files[0];
                const filePath = body.path || file.originalname || 'uploaded-file';
                const stream = createReadStream(file.path);

                const response = await this.fileApiService.handleFileUpload(sessionId, filePath, stream);
                return res.status(HttpStatus.OK).json(response);
            }

            // Handle URL download (if provided as string in body.file)
            if (body.file && typeof body.file === 'string') {
                // TODO: Implement URL download logic
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
                message: error.message
            });
        }
    }

    @Get("/sessions/:sessionId/files")
    async listFiles(
        @Param("sessionId") sessionId: string,
        @Res() res: ExpressResponse
    ) {
        try {
            const response = await this.fileApiService.handleFileList(sessionId);
            return res.status(HttpStatus.OK).json(response);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    @Get("/sessions/:sessionId/files/*")
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
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'File not found'
            });
        }
    }

    @Head("/sessions/:sessionId/files/*")
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
            return res.status(HttpStatus.NOT_FOUND).send();
        }
    }


    @Delete("/sessions/:sessionId/files/*")
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
                message: error.message
            });
        }
    }

    @Delete("/sessions/:sessionId/files")
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
                message: error.message
            });
        }
    }
}
