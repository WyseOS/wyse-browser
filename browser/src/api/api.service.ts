import { Injectable } from '@nestjs/common';
import {
  CreateFlowDto,
  DeployFlowDto,
  FireFlowDto,
  GetMetadataDto,
  UpdateMetadataDto,
} from './dto/api.flow.dto';
import { BrowserActionDto } from './dto/api.action.dto';
import {
  Response,
  responseMessage,
  responseNotFound,
  responseBadRequest,
  responseInternalError,
} from './dto/response.dto';
import path from 'path';
import fs from 'fs';
import {
  FlowMetadataPath,
  WorkletMetadataPath,
  ProxyMetadataPath,
  ProfileMetadataPath,
  MaxPagesNumberPerSession,
  GetDateYYYYMMDD,
} from '../constants';
import { Runtime } from '../runtime';
import { MetadataType } from '../constants';
import { SessionContext } from '../session_context';
import { CreateSessionDto } from './dto/api.session.dto';
import { Logger } from '@nestjs/common';
import { OSSUpload } from '../utils/oss';
import { v4 as uuidv4 } from 'uuid';
import { BatchActionsDto } from './dto/api.action.dto';
import {
  CreateProxyDto,
  CreateProfileDto,
  UpdateProxyDto,
  DeleteProxyDto,
  DeleteProfileDto,
  UpdateProfileDto,
} from './dto/api.proxy.dto';

@Injectable()
export class ApiService {
  private logger: Logger;

  constructor(private readonly runtime: Runtime) {
    this.logger = new Logger(ApiService.name);
  }

  // 会话创建逻辑
  private async ensureSessionExists(
    session_id: string,
    is_save_video: boolean,
    extension_names: string[],
    context: string, // 用于错误日志的上下文
  ): Promise<{ sessionId: string; error?: Response }> {
    if (!session_id) {
      let sessionContext = SessionContext.Default();
      sessionContext.isSaveVideo = is_save_video;
      sessionContext.extensionNames = extension_names;
      const newSessionId = uuidv4();
      try {
        await this.runtime.createSession(sessionContext, newSessionId);
        this.logger.log(
          `Created new session for ${context}, session_id: ${newSessionId}`,
        );
        return { sessionId: newSessionId };
      } catch (error) {
        this.logger.error(
          `Failed to create session for ${context}: ${error.message}`,
        );
        return {
          sessionId: '',
          error: responseInternalError({
            session_id: '',
            result: `Failed to create session: ${error.message}`,
          }),
        };
      }
    } else {
      const session = this.runtime.getSession(session_id);
      if (!session) {
        this.logger.error(
          `${context} failed, invalid session_id: ${session_id}`,
        );
        return {
          sessionId: session_id,
          error: responseNotFound({
            session_id: session_id,
            result: 'Error: Invalid session id',
          }),
        };
      }
      return { sessionId: session_id };
    }
  }

  private loadMetadata(type: MetadataType, name: string): string {
    let resolvePath = '';
    if (type === MetadataType.FLOW) {
      resolvePath = path.resolve(
        '../',
        `${FlowMetadataPath}${name}/manifest.json`,
      );
    } else if (type === MetadataType.WORKLET) {
      resolvePath = path.resolve(
        '../',
        `${WorkletMetadataPath}${name}/manifest.json`,
      );
    } else if (type === MetadataType.PROXY) {
      resolvePath = path.resolve(
        '../',
        `${ProxyMetadataPath}${name}/manifest.json`,
      );
    } else if (type === MetadataType.PROFILE) {
      resolvePath = path.resolve(
        '../',
        `${ProfileMetadataPath}${name}/manifest.json`,
      );
    }

    if (!fs.existsSync(resolvePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(resolvePath, 'utf8'));
  }

  async createFlow(createFlowDto: CreateFlowDto): Promise<Response> {
    const flow_name = createFlowDto.flow_name;
    const metadata = this.loadMetadata(MetadataType.FLOW, flow_name);

    if (metadata === null) {
      return responseNotFound({
        flow_name: flow_name,
        flow_instance_id: '',
        session_id: '',
      });
    }

    const { sessionId, error } = await this.ensureSessionExists(
      createFlowDto.session_id,
      createFlowDto.is_save_video,
      createFlowDto.extension_names,
      'createFlow',
    );
    if (error) {
      return error;
    }

    const id = await this.runtime.addFlow(metadata, sessionId);
    this.logger.log(
      `Flow created: ${flow_name}, instance_id: ${id}, session_id: ${sessionId}`,
    );
    return responseMessage({
      flow_name: flow_name,
      flow_instance_id: id,
      session_id: sessionId,
    });
  }

  async deployFlow(deployFlowDto: DeployFlowDto): Promise<Response> {
    const flow = deployFlowDto.flow;
    const { sessionId, error } = await this.ensureSessionExists(
      deployFlowDto.session_id,
      deployFlowDto.is_save_video,
      deployFlowDto.extension_names,
      'deployFlow',
    );
    if (error) {
      return error;
    }

    const id = await this.runtime.addFlow(JSON.stringify(flow), sessionId);
    this.logger.log(
      `Flow deployed: ${flow.name}, instance_id: ${id}, session_id: ${sessionId}`,
    );
    return responseMessage({
      flow_name: flow.name,
      flow_instance_id: id,
      session_id: sessionId,
    });
  }

  async fireFlow(fireFlowDto: FireFlowDto): Promise<Response> {
    const action_name = fireFlowDto.action_name;
    const flow_instance_id = fireFlowDto.flow_instance_id;
    const data = fireFlowDto.data;

    if (!this.runtime.checkFlowExists(flow_instance_id)) {
      return responseNotFound({
        flow_instance_id: flow_instance_id,
        action_name: action_name,
        session_id: '',
        result: 'Flow instance not found',
      });
    }

    try {
      const result = await this.runtime.fire(
        flow_instance_id,
        action_name,
        data,
      );
      this.logger.log(
        `Flow fired: instance_id: ${flow_instance_id}, action: ${action_name}, session_id: ${this.runtime.getSessionId(flow_instance_id)}`,
      );
      return responseMessage({
        flow_instance_id: flow_instance_id,
        action_name: action_name,
        session_id: this.runtime.getSessionId(flow_instance_id),
        result: result,
      });
    } catch (error) {
      this.logger.error(
        `Fire flow failed: instance_id: ${flow_instance_id}, action: ${action_name}, error: ${error}`,
      );
      return responseInternalError({
        flow_instance_id: flow_instance_id,
        action_name: action_name,
        session_id: '',
        result: error,
      });
    }
  }

  listFlows(): Response {
    const flows = this.runtime.listFlows();
    return responseMessage({ flows: flows });
  }

  async listMetadata(type: MetadataType): Promise<Response> {
    let metadata_list = [];
    if (type === MetadataType.FLOW) {
      const dirNames = fs.readdirSync(path.resolve('../', FlowMetadataPath));
      metadata_list = dirNames
        .map((name) => this.loadMetadata(MetadataType.FLOW, name))
        .filter((metadata) => metadata !== null);
    } else if (type === MetadataType.WORKLET) {
      const dirNames = fs.readdirSync(path.resolve('../', WorkletMetadataPath));
      metadata_list = dirNames
        .map((name) => this.loadMetadata(MetadataType.WORKLET, name))
        .filter((metadata) => metadata !== null);
    }
    return responseMessage({ metadata_type: type, data: metadata_list });
  }

  async listProxy(): Promise<Response> {
    const dirNames = fs.readdirSync(path.resolve('../', ProxyMetadataPath));
    const proxy_list = dirNames
      .map((name) => {
        const data = this.loadMetadata(MetadataType.PROXY, name);
        return data;
      })
      .filter((metadata) => metadata !== null);
    return responseMessage({ data: proxy_list });
  }
  async listProfile(): Promise<Response> {
    const dirNames = fs.readdirSync(path.resolve('../', ProfileMetadataPath));
    const profile_list = dirNames
      .map((name) => this.loadMetadata(MetadataType.PROFILE, name))
      .filter((metadata) => metadata !== null);
    return responseMessage({ data: profile_list });
  }

  async updateProxy(updateProxy: UpdateProxyDto): Promise<Response> {
    const proxyId = updateProxy.proxy_id;
    const loadCurrent = this.loadMetadata(MetadataType.PROXY, proxyId);

    if (loadCurrent === null) {
      const proxyPath = path.resolve('../', `${ProxyMetadataPath}${proxyId}`);
      fs.mkdirSync(proxyPath, { recursive: true });
      const readmePath = path.resolve(
        '../',
        `${ProxyMetadataPath}${proxyId}/README.md`,
      );
      fs.writeFileSync(readmePath, '# ' + proxyId);
    }

    const jsonData = JSON.stringify(updateProxy);
    const filePath = path.resolve(
      '../',
      `${ProxyMetadataPath}${proxyId}/manifest.json`,
    );
    fs.writeFileSync(filePath, jsonData);
    return responseMessage({
      metadata_type: MetadataType.PROXY,
      data: updateProxy,
    });
  }
  async deleteProxy(deleteProxy: DeleteProxyDto): Promise<Response> {
    const proxyId = deleteProxy.proxy_id;
    const safeFilePath = path.resolve('../', ProxyMetadataPath, proxyId);
    await fs.promises.rm(safeFilePath, { recursive: true, force: true });

    return responseMessage({
      metadata_type: MetadataType.PROXY,
    });
  }
  async createProxy(createProxy: CreateProxyDto): Promise<Response> {
    const proxyHost = createProxy.host;
    const proxyPort = createProxy.port;
    const proxyId = `${proxyHost}:${proxyPort}`;
    const loadProfile = this.loadMetadata(MetadataType.PROXY, proxyId);
    if (loadProfile === null) {
      const proxyPath = path.resolve('../', `${ProxyMetadataPath}${proxyId}`);
      fs.mkdirSync(proxyPath, { recursive: true });
      const readmePath = path.resolve(
        '../',
        `${ProxyMetadataPath}${proxyId}/README.md`,
      );
      fs.writeFileSync(readmePath, '# ' + proxyId);
    }

    const jsonData = JSON.stringify({ ...createProxy, proxy_id: proxyId });
    const filePath = path.resolve(
      '../',
      `${ProxyMetadataPath}${proxyId}/manifest.json`,
    );
    fs.writeFileSync(filePath, jsonData);
    return responseMessage({
      metadata_type: MetadataType.PROXY,
      data: createProxy,
    });
  }
  async createProfile(createProfileDto: CreateProfileDto): Promise<Response> {
    const profile_id = uuidv4();
    const loadCurrent = this.loadMetadata(MetadataType.PROFILE, profile_id);
    if (loadCurrent === null) {
      const currentPath = path.resolve(
        '../',
        `${ProfileMetadataPath}${profile_id}`,
      );
      fs.mkdirSync(currentPath, { recursive: true });
      const readmePath = path.resolve(
        '../',
        `${ProfileMetadataPath}${profile_id}/README.md`,
      );
      fs.writeFileSync(readmePath, '# ' + profile_id);
    }

    const jsonData = JSON.stringify({ ...createProfileDto, profile_id });
    const filePath = path.resolve(
      '../',
      `${ProfileMetadataPath}${profile_id}/manifest.json`,
    );
    fs.writeFileSync(filePath, jsonData);
    return responseMessage({
      metadata_type: MetadataType.PROFILE,
      profile_id: profile_id,
      data: createProfileDto,
    });
  }
  async updateProfile(updateProfileDto: UpdateProfileDto): Promise<Response> {
    const profile_id = updateProfileDto.profile_id;
    const loadCurrent = this.loadMetadata(MetadataType.PROFILE, profile_id);
    if (loadCurrent === null) {
      const currentPath = path.resolve(
        '../',
        `${ProfileMetadataPath}${profile_id}`,
      );
      fs.mkdirSync(currentPath, { recursive: true });
      const readmePath = path.resolve(
        '../',
        `${ProfileMetadataPath}${profile_id}/README.md`,
      );
      fs.writeFileSync(readmePath, '# ' + profile_id);
    }

    const jsonData = JSON.stringify({
      ...updateProfileDto,
      profile_id: profile_id,
    });
    const filePath = path.resolve(
      '../',
      `${ProfileMetadataPath}${profile_id}/manifest.json`,
    );
    fs.writeFileSync(filePath, jsonData);
    return responseMessage({
      metadata_type: MetadataType.PROFILE,
      profile_id: profile_id,
      data: updateProfileDto,
    });
  }

  async deleteProfile(deleteProfile: DeleteProfileDto): Promise<Response> {
    const id = deleteProfile.profile_id;
    const safeFilePath = path.resolve('../', ProfileMetadataPath, id);
    await fs.promises.rm(safeFilePath, { recursive: true, force: true });

    return responseMessage({
      metadata_type: MetadataType.PROFILE,
    });
  }

  async updateMetadata(
    type: MetadataType,
    updateDto: UpdateMetadataDto,
  ): Promise<Response> {
    if (type === MetadataType.FLOW) {
      // Validation is now handled by DTO validators
      if (updateDto.data.name !== updateDto.name) {
        return responseBadRequest({
          metadata_type: type,
          name: '',
          data: null,
          result: 'Error: flow name and data.name must match',
        });
      }

      // Check if the flow exists, create directory if needed
      const metadata = this.loadMetadata(MetadataType.FLOW, updateDto.name);
      if (metadata === null) {
        const flowPath = path.resolve(
          '../',
          `${FlowMetadataPath}${updateDto.name}`,
        );
        fs.mkdirSync(flowPath, { recursive: true });

        // Add README.md
        const readmePath = path.resolve(
          '../',
          `${FlowMetadataPath}${updateDto.name}/README.md`,
        );
        fs.writeFileSync(readmePath, '# ' + updateDto.name);
      }

      // Save file
      const jsonData = JSON.stringify(updateDto.data);
      const filePath = path.resolve(
        '../',
        `${FlowMetadataPath}${updateDto.name}/manifest.json`,
      );
      fs.writeFileSync(filePath, jsonData);

      return responseMessage({
        metadata_type: type,
        name: updateDto.name,
        data: updateDto.data,
      });
    } else {
      return responseNotFound({
        metadata_type: type,
        name: '',
        data: null,
        result: 'Error: not implemented',
      });
    }
  }

  async getMetadata(getMetadataDto: GetMetadataDto): Promise<Response> {
    const type = getMetadataDto.metadata_type;
    const name = getMetadataDto.name;

    const metadata = this.loadMetadata(type, name);
    return responseMessage({ metadata_type: type, name: name, data: metadata });
  }

  async getDefaultSession(): Promise<Response> {
    const session = await this.runtime.getDefaultSession();
    if (!session) {
      this.logger.error('Default session not found');
      return responseNotFound({
        session_id: '',
        result: 'Error: Default session not found',
      });
    }

    let rj = await session.toJson();
    return responseMessage({ session_id: session.id, session: rj });
  }

  async createSession(createSessionDto: CreateSessionDto): Promise<Response> {
    try {
      const sessionContext = SessionContext.FromJson(
        JSON.stringify(createSessionDto),
      );
      const sessionId = await this.runtime.createSession(
        sessionContext,
        createSessionDto.session_id,
      );
      return responseMessage({ session_id: sessionId });
    } catch (error) {
      this.logger.error(`Create session failed: ${error.message}`);
      this.logger.error(
        `Input DTO was: ${JSON.stringify(createSessionDto, null, 2)}`,
      );
      return responseInternalError({
        session_id: '',
        result: error.message,
      });
    }
  }

  async addInitScript(sessionId: string, script: string): Promise<Response> {
    if (!sessionId) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Session ID is required',
      });
    }

    if (!script) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Script is required',
      });
    }

    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Invalid session ID',
      });
    }

    try {
      await session.addInitScript(script);
      this.logger.log(`Init script added for session: ${sessionId}`);
      return responseMessage({
        session_id: sessionId,
        result: 'Init script added successfully',
      });
    } catch (error) {
      this.logger.error(
        `Add init script failed, session: ${sessionId}, error: ${error.message}`,
      );
      return responseInternalError({
        session_id: sessionId,
        result: error.message,
      });
    }
  }

  async getSession(sessionId: string): Promise<Response> {
    if (!sessionId) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Session ID is required',
      });
    }

    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return responseNotFound({ session_id: sessionId });
    }

    try {
      let rj = await session.toJson();
      return responseMessage({ session_id: sessionId, session: rj });
    } catch (error) {
      this.logger.error(`Error getting session info: ${error.message}`);
      return responseInternalError({
        session_id: sessionId,
        result: error.message,
      });
    }
  }

  getSessionContext(sessionId: string): Response {
    if (!sessionId) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Invalid session id',
      });
    }

    try {
      const sessionContext = this.runtime.getContext(sessionId);
      if (!sessionContext) {
        this.logger.error(`Session context not found for ID: ${sessionId}`);
        return responseInternalError({
          session_id: sessionId,
          result: 'Session context not found',
        });
      }

      const contextJson = sessionContext.toJson();
      this.logger.log(
        `Retrieved session context for ID ${sessionId}: ${JSON.stringify(contextJson, null, 2)}`,
      );
      return responseMessage({ session_context: contextJson });
    } catch (error) {
      this.logger.error(`Error getting session context: ${error.message}`);
      return responseInternalError({
        session_id: sessionId,
        result: `Error getting session context: ${error.message}`,
      });
    }
  }

  async releaseSession(sessionId: string): Promise<Response> {
    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return responseNotFound({
        session_id: sessionId,
        result: 'Session not found',
        pages: [],
      });
    }

    try {
      const pages = await this.runtime.releaseSession(sessionId);
      return responseMessage({
        session_id: sessionId,
        result: 'Session released',
        pages: pages,
      });
    } catch (error) {
      this.logger.error(
        `Session release failed, id: ${sessionId}, error: ${error}`,
      );
      return responseInternalError({
        session_id: sessionId,
        result: error,
        pages: [],
      });
    }
  }

  async listSessions(): Promise<Response> {
    const sessions = this.runtime.listSessions();
    return responseMessage({
      sessions: await Promise.all(
        sessions.map(async (session) => await session.toJson()),
      ),
    });
  }

  async screenshot(sessionId: string): Promise<Response> {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const session = this.runtime.getSession(sessionId);

    if (!session) {
      return responseNotFound({
        timestamp: date,
        session_id: sessionId,
        screenshot: null,
      });
    }

    try {
      const screenshot = await session.screenshot();
      return responseMessage({
        timestamp: date,
        session_id: sessionId,
        screenshot: screenshot,
      });
    } catch (error) {
      this.logger.error(
        `Screenshot failed, session: ${sessionId}, error: ${error.message}`,
      );
      return responseInternalError({
        timestamp: date,
        session_id: sessionId,
        screenshot: null,
        result: error.message,
      });
    }
  }

  async createPage(sessionId: string): Promise<Response> {
    if (!sessionId) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Session ID is required',
      });
    }

    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return responseNotFound({ session_id: sessionId });
    }

    try {
      const pages = await session.getPages();
      if (pages.length >= MaxPagesNumberPerSession) {
        return responseMessage({
          session_id: sessionId,
          result: 'The number of pages exceeds maximum allowed',
        });
      }

      let page = await session.browserContext.newPage();
      page.setDefaultTimeout(session.timeout);
      this.logger.log(`Page created for session: ${sessionId}`);
      return responseMessage({
        session_id: sessionId,
        result: 'Page created successfully',
      });
    } catch (error) {
      this.logger.error(
        `Create page failed, session: ${sessionId}, error: ${error.message}`,
      );
      return responseInternalError({
        session_id: sessionId,
        result: error.message,
      });
    }
  }

  async switchPage(sessionId: string, pageId: number): Promise<Response> {
    if (!sessionId) {
      return responseBadRequest({
        session_id: sessionId,
        result: 'Error: Session ID is required',
      });
    }

    if (pageId < 0) {
      return responseBadRequest({
        session_id: sessionId,
        page_id: pageId,
        result: 'Error: Page ID must be non-negative',
      });
    }

    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return responseNotFound({ session_id: sessionId });
    }

    try {
      const pages = await session.getPages();
      if (pageId >= pages.length) {
        return responseMessage({
          session_id: sessionId,
          page_id: pageId,
          result: 'The page does not exist',
        });
      }

      let page = pages[pageId];
      await page.bringToFront();
      this.logger.log(
        `Page switched for session: ${sessionId}, page_id: ${pageId}`,
      );
      return responseMessage({
        session_id: sessionId,
        page_id: pageId,
        result: 'Page switched successfully',
      });
    } catch (error) {
      this.logger.error(
        `Switch page failed, session: ${sessionId}, page: ${pageId}, error: ${error.message}`,
      );
      return responseInternalError({
        session_id: sessionId,
        page_id: pageId,
        result: error.message,
      });
    }
  }

  async releasePage(sessionId: string, pageId: number): Promise<Response> {
    const session = this.runtime.getSession(sessionId);
    if (!session) {
      return responseNotFound({ session_id: sessionId });
    }

    try {
      const pages = await session.getPages();
      if (pageId >= pages.length) {
        return responseMessage({
          result: 'The page does not exist',
          video_url: '',
        });
      }

      let page = pages[pageId];
      let today = GetDateYYYYMMDD();
      let ossUrl = '';

      // 获取视频路径（如果存在）
      let videoPath = null;
      if (session.isSaveVideo) {
        try {
          const video = await page.video();
          if (video) {
            videoPath = await video.path();
          }
        } catch (error) {
          this.logger.warn(`Error getting video path: ${error.message}`);
        }
      }

      // 关闭页面
      await page.close();

      // 处理视频上传
      if (session.isSaveVideo && videoPath) {
        try {
          let filename =
            'screenshot/' +
            today +
            '/' +
            sessionId +
            '/video_' +
            path.basename(videoPath);

          // 等待视频文件写入完成
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // 检查文件是否存在
          if (!fs.existsSync(videoPath)) {
            this.logger.warn(`Video file not found: ${videoPath}`);
            return responseMessage({ result: '', video_url: '' });
          }

          const stats = await fs.promises.stat(videoPath);
          if (stats.size === 0) {
            this.logger.error(`Video is empty when upload: ${videoPath}`);
            return responseMessage({ result: '', video_url: '' });
          }

          ossUrl = await OSSUpload.upload(filename, videoPath);

          // 清理视频文件
          try {
            await page.video().delete();
          } catch (error) {
            this.logger.warn(`Error deleting video file: ${error.message}`);
          }
        } catch (error) {
          this.logger.error(`Error processing video: ${error.message}`);
        }
      }

      this.logger.log(
        `Page released for session: ${sessionId}, page_id: ${pageId}`,
      );
      return responseMessage({ result: '', video_url: ossUrl });
    } catch (error) {
      this.logger.error(
        `Release page failed, session: ${sessionId}, page: ${pageId}, error: ${error.message}`,
      );
      return responseInternalError({
        session_id: sessionId,
        page_id: pageId,
        result: error.message,
      });
    }
  }

  async browserAction(browserActionDto: BrowserActionDto): Promise<Response> {
    const session_id = browserActionDto.session_id;
    const page_id = browserActionDto.page_id;
    const action_name = browserActionDto.action_name;
    const data = browserActionDto.data;

    try {
      const result = await this.runtime.browserAction(
        session_id,
        page_id,
        action_name,
        data,
      );
      return responseMessage({
        session_id: session_id,
        page_id: page_id,
        action_name: action_name,
        result: result,
      });
    } catch (error) {
      this.logger.error(
        `Action failed, session: ${session_id}, page: ${page_id}, action: ${action_name}, error: ${error.message}`,
      );
      return responseInternalError({
        session_id: session_id,
        page_id: page_id,
        action_name: action_name,
        result: error.message,
      });
    }
  }

  async batchAction(batchActionDto: BatchActionsDto): Promise<Response> {
    const session_id = batchActionDto.session_id;
    const page_id = batchActionDto.page_id;

    const session = this.runtime.getSession(session_id);
    if (!session) {
      return responseNotFound({
        session_id: session_id,
        page_id: page_id,
        results: [],
        overall_status: 'failed',
      });
    }

    try {
      this.logger.log(
        `Start Batch Actions, session: ${session_id}, page: ${page_id}, actions: ${JSON.stringify(batchActionDto.actions)}`,
      );
      const results = await this.runtime.batchBrowserAction(
        session_id,
        page_id,
        batchActionDto.actions,
      );

      const actionResults = results.map((result, index) => ({
        action_name: batchActionDto.actions[index].action_name,
        result: result,
        status: 'success' as const,
        sequence: index, // Add sequence number to explicitly show order
      }));

      return responseMessage({
        session_id: session_id,
        page_id: page_id,
        results: actionResults,
        overall_status: 'completed',
      });
    } catch (error) {
      this.logger.error(
        `Batch Actions Failed, session: ${session_id}, error: ${error.message}`,
      );

      return responseInternalError({
        session_id: session_id,
        page_id: page_id,
        results: [],
        overall_status: 'failed',
        error: error.message,
      });
    }
  }
}
