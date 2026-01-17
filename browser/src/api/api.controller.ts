import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  Param,
  Logger,
} from '@nestjs/common';
import {
  CreateFlowDto,
  DeployFlowDto,
  FireFlowDto,
  UpdateMetadataDto,
} from './dto/api.flow.dto';
import {
  CreateProxyDto,
  CreateProfileDto,
  UpdateProxyDto,
  DeleteProxyDto,
  UpdateProfileDto,
  DeleteProfileDto,
} from './dto/api.proxy.dto';
import { BrowserActionDto } from './dto/api.action.dto';
import { CreateSessionDto, AddInitScriptDto } from './dto/api.session.dto';
import { ApiService } from './api.service';
import { Response, responseMessage } from './dto/response.dto';
import { Res } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { MetadataType } from '../constants';
@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) { }

  @Get('/health')
  health(): Response {
    return responseMessage('alive');
  }

  @Post('/flow/create')
  async createFlow(
    @Body() createFlowDto: CreateFlowDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.createFlow(createFlowDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/flow/deploy')
  async deployFlow(
    @Body() deployFlowDto: DeployFlowDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.deployFlow(deployFlowDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/proxy/create')
  async createProxy(
    @Body() createProxyDto: CreateProxyDto,
    @Res() res: ExpressResponse,
  ) {
    console.log('get data', createProxyDto);
    const response = await this.apiService.createProxy(createProxyDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/proxy/update')
  async updateProxy(
    @Body() updateProxyDto: UpdateProxyDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.updateProxy(updateProxyDto);
    return res.status(HttpStatus.OK).json(response);
  }
  @Post('/proxy/delete')
  async deleteProxy(
    @Body() deleteProxyDto: DeleteProxyDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.deleteProxy(deleteProxyDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/profile/create')
  async createProfile(
    @Body() createProfileDto: CreateProfileDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.createProfile(createProfileDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/profile/update')
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.updateProfile(updateProfileDto);
    return res.status(HttpStatus.OK).json(response);
  }
  @Post('/profile/delete')
  async deleteProfile(
    @Body() deleteProfieDto: DeleteProfileDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.deleteProfile(deleteProfieDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/flow/fire')
  async fireFlow(
    @Body() fireFlowDto: FireFlowDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.fireFlow(fireFlowDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/flow/list')
  async listFlows(@Res() res: ExpressResponse) {
    const response = await this.apiService.listFlows();
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/proxy/list')
  async listProxy(@Res() res: ExpressResponse) {
    const response = await this.apiService.listProxy();
    return res.status(HttpStatus.OK).json(response);
  }
  @Get('/profile/list')
  async listProfile(@Res() res: ExpressResponse) {
    const response = await this.apiService.listProfile();
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/metadata/flow/:name')
  async getFlowMetadata(
    @Param('name') name: string,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.getMetadata({
      metadata_type: MetadataType.FLOW,
      name: name,
    });
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/metadata/worklet/:name')
  async getWorkletMetadata(
    @Param('name') name: string,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.getMetadata({
      metadata_type: MetadataType.WORKLET,
      name: name,
    });
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/metadata/list/:type')
  async listMetadata(
    @Param('type') type: MetadataType,
    @Res() res: ExpressResponse,
  ) {
    if (type !== MetadataType.FLOW && type !== MetadataType.WORKLET) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(responseMessage('Error: Invalid metadata type'));
    }
    const response = await this.apiService.listMetadata(type);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/metadata/save')
  async saveMetadata(
    @Body() updateDto: UpdateMetadataDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.updateMetadata(
      updateDto.metadata_type,
      updateDto,
    );
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/session/create')
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.createSession(createSessionDto);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/session/:sessionId/add_init_script')
  async addInitScript(
    @Param('sessionId') sessionId: string,
    @Body() addInitScriptDto: AddInitScriptDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.addInitScript(
      sessionId,
      addInitScriptDto.script,
    );
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/session/:sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Res() res: ExpressResponse,
  ) {
    if (sessionId === 'default') {
      const response = await this.apiService.getDefaultSession();
      return res.status(HttpStatus.OK).json(response);
    }
    const response = await this.apiService.getSession(sessionId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/session/:sessionId/context')
  async getSessionContext(
    @Param('sessionId') sessionId: string,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.getSessionContext(sessionId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/session/:sessionId/release')
  async releaseSession(
    @Param('sessionId') sessionId: string,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.releaseSession(sessionId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/sessions/list')
  async listSessions(@Res() res: ExpressResponse) {
    const response = await this.apiService.listSessions();
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/session/:sessionId/screenshot')
  async screenshot(
    @Param('sessionId') sessionId: string,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.screenshot(sessionId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/session/:sessionId/page/create')
  async createPage(
    @Param('sessionId') sessionId: string,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.createPage(sessionId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/session/:sessionId/page/:pageId/switch')
  async switchPage(
    @Param('sessionId') sessionId: string,
    @Param('pageId') pageId: number,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.switchPage(sessionId, pageId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Get('/session/:sessionId/page/:pageId/release')
  async releasePage(
    @Param('sessionId') sessionId: string,
    @Param('pageId') pageId: number,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.releasePage(sessionId, pageId);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('/browser/action')
  async browserAction(
    @Body() browserActionDto: BrowserActionDto,
    @Res() res: ExpressResponse,
  ) {
    const response = await this.apiService.browserAction(browserActionDto);
    return res.status(HttpStatus.OK).json(response);
  }
}
