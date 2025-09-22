import fs from 'fs';
import path from 'path';

export interface ToolDetail {
  // 详细信息字段，后续可以扩展
  [key: string]: any;
}

export interface ToolData {
  toolUrl: string;
  logoUrl: string;
  title: string;
  description: string;
  website: string;
  detail?: ToolDetail;
  lastUpdated?: string;
}

interface SecondCategory {
  name: string;
  url: string;
  tools: ToolData[];
}

interface ToolCategory {
  name: string;
  url: string;
  lastUpdated: string;
  secondCategories: SecondCategory[];
}

interface ToolDatabase {
  version: string;
  lastUpdated: string;
  categories: ToolCategory[];
}

export class IncrementalToolDataManager {
  private baseDir: string;
  private baseFilePath: string;
  private incremental: boolean;
  private baseFileName: string;

  constructor(baseDir: string = './data', incremental: boolean = true, baseFileName: string = 'base.json') {
    this.baseDir = path.resolve(baseDir);
    this.incremental = incremental;
    this.baseFileName = baseFileName;

    this.baseFilePath = path.join(this.baseDir, this.baseFileName);
    
    // 确保目录存在
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    // 初始化基础文件
    this.initializeBaseFile();
  }

  private initializeBaseFile(): void {
    if (!fs.existsSync(this.baseFilePath)) {
      const initialData: ToolDatabase = {
        version: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        categories: []
      };
      this.saveDataToFile(this.baseFilePath, initialData);
    }
  }

  private loadDataFromFile(filePath: string): ToolDatabase {
    try {
      if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error(`Error loading data from ${filePath}:`, error);
    }

    return {
      version: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      categories: []
    };
  }

  private saveDataToFile(filePath: string, data: ToolDatabase): void {
    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      console.log(`Data saved to ${filePath}`);
    } catch (error) {
      console.error(`Error saving data to ${filePath}:`, error);
    }
  }

  private getAllIncrementalFiles(): string[] {
    const files = fs.readdirSync(this.baseDir);
    return files
      .filter(file => 
        file.startsWith('incremental_') && 
        file.endsWith('.json') && 
        file !== 'base.json'
      )
      .map(file => path.join(this.baseDir, file))
      .sort(); // 按文件名排序，确保按时间顺序处理
  }

  private getAllToolUrls(): Set<string> {
    const allUrls = new Set<string>();
    
    // 从 base.json 获取所有 URL
    const baseData = this.loadDataFromFile(this.baseFilePath);
    this.collectToolUrls(baseData, allUrls);
    
    // 从所有增量文件获取所有 URL
    const incrementalFiles = this.getAllIncrementalFiles();
    incrementalFiles.forEach(file => {
      const data = this.loadDataFromFile(file);
      this.collectToolUrls(data, allUrls);
    });
    
    return allUrls;
  }

  private collectToolUrls(data: ToolDatabase, urlSet: Set<string>): void {
    data.categories.forEach(category => {
      category.secondCategories.forEach(secondCategory => {
        secondCategory.tools.forEach(tool => {
          urlSet.add(tool.toolUrl);
        });
      });
    });
  }

  /**
   * 添加或更新工具到指定的二级分类
   */
  public upsertTool(
    categoryName: string,
    categoryUrl: string,
    secondCategoryName: string,
    secondCategoryUrl: string,
    tool: ToolData,
    createCategoryIfNotExist: boolean = true
  ): boolean {
    if (this.incremental) {
      // 增量模式：检查工具是否已存在
      const allExistingUrls = this.getAllToolUrls();
      
      // 如果工具已存在，不进行增量更新
      if (allExistingUrls.has(tool.toolUrl)) {
        console.log(`Tool ${tool.toolUrl} already exists, skipping...`);
        return false;
      }

      // 工具不存在，添加到增量文件
      const now = new Date().toISOString();
      const incrementalFileName = `incremental_${now.replace(/[:.]/g, '-')}.json`;
      const incrementalFilePath = path.join(this.baseDir, incrementalFileName);
      
      let incrementalData: ToolDatabase;
      
      if (fs.existsSync(incrementalFilePath)) {
        incrementalData = this.loadDataFromFile(incrementalFilePath);
      } else {
        incrementalData = {
          version: now,
          lastUpdated: now,
          categories: []
        };
      }

      let category = incrementalData.categories.find(c => c.name === categoryName);
      if (!category) {
        if (!createCategoryIfNotExist) {
          throw new Error(`Category '${categoryName}' not found`);
        }
        category = {
          name: categoryName,
          url: categoryUrl,
          lastUpdated: now,
          secondCategories: []
        };
        incrementalData.categories.push(category);
      }

      let secondCategory = category.secondCategories.find(sc => sc.name === secondCategoryName);
      if (!secondCategory) {
        secondCategory = {
          name: secondCategoryName,
          url: secondCategoryUrl,
          tools: []
        };
        category.secondCategories.push(secondCategory);
      }

      secondCategory.tools.push({
        ...tool,
        lastUpdated: now
      });

      category.lastUpdated = now;
      incrementalData.lastUpdated = now;
      incrementalData.version = now;

      this.saveDataToFile(incrementalFilePath, incrementalData);
      return true;
    } else {
      // 非增量模式：直接保存到 base.json
      const baseData = this.loadDataFromFile(this.baseFilePath);
      const now = new Date().toISOString();
      
      let category = baseData.categories.find(c => c.name === categoryName);
      if (!category) {
        if (!createCategoryIfNotExist) {
          throw new Error(`Category '${categoryName}' not found`);
        }
        category = {
          name: categoryName,
          url: categoryUrl,
          lastUpdated: now,
          secondCategories: []
        };
        baseData.categories.push(category);
      }

      let secondCategory = category.secondCategories.find(sc => sc.name === secondCategoryName);
      if (!secondCategory) {
        secondCategory = {
          name: secondCategoryName,
          url: secondCategoryUrl,
          tools: []
        };
        category.secondCategories.push(secondCategory);
      }

      // 检查工具是否已存在
      const existingToolIndex = secondCategory.tools.findIndex(t => t.toolUrl === tool.toolUrl);
      
      if (existingToolIndex === -1) {
        // 新工具
        secondCategory.tools.push({
          ...tool,
          lastUpdated: now
        });
      } else {
        // 更新现有工具
        secondCategory.tools[existingToolIndex] = {
          ...tool,
          lastUpdated: now
        };
      }

      category.lastUpdated = now;
      baseData.lastUpdated = now;
      baseData.version = now;

      this.saveDataToFile(this.baseFilePath, baseData);
      return true;
    }
  }

  /**
   * 批量添加或更新工具
   */
  public batchUpsertTools(
    categoryName: string,
    categoryUrl: string,
    secondCategoryName: string,
    secondCategoryUrl: string,
    tools: ToolData[],
    createCategoryIfNotExist: boolean = true
  ): number {
    let addedCount = 0;
    
    tools.forEach(tool => {
      if (this.upsertTool(categoryName, categoryUrl, secondCategoryName, secondCategoryUrl, tool, createCategoryIfNotExist)) {
        addedCount++;
      }
    });
    
    const mode = this.incremental ? 'incremental files' : 'base.json';
    console.log(`Added/Updated ${addedCount} tools to ${mode}`);
    return addedCount;
  }

  /**
   * 获取所有数据（包括基础数据和所有增量数据）
   */
  public getAllData(): ToolDatabase {
    // 先加载基础数据
    const baseData = this.loadDataFromFile(this.baseFilePath);
    
    if (this.incremental) {
      // 增量模式：合并所有增量数据
      const incrementalFiles = this.getAllIncrementalFiles();
      const mergedData: ToolDatabase = {
        version: baseData.version,
        lastUpdated: baseData.lastUpdated,
        categories: JSON.parse(JSON.stringify(baseData.categories)) // 深拷贝
      };

      incrementalFiles.forEach(filePath => {
        const incrementalData = this.loadDataFromFile(filePath);
        this.mergeData(mergedData, incrementalData);
      });

      return mergedData;
    } else {
      // 非增量模式：只返回基础数据
      return baseData;
    }
  }

  private mergeData(target: ToolDatabase, source: ToolDatabase): void {
    source.categories.forEach(sourceCategory => {
      let targetCategory = target.categories.find(c => c.name === sourceCategory.name);
      
      if (!targetCategory) {
        targetCategory = {
          name: sourceCategory.name,
          url: sourceCategory.url,
          lastUpdated: sourceCategory.lastUpdated,
          secondCategories: []
        };
        target.categories.push(targetCategory);
      }

      sourceCategory.secondCategories.forEach(sourceSecond => {
        let targetSecond = targetCategory!.secondCategories.find(sc => sc.name === sourceSecond.name);
        
        if (!targetSecond) {
          targetSecond = {
            name: sourceSecond.name,
            url: sourceSecond.url,
            tools: []
          };
          targetCategory!.secondCategories.push(targetSecond);
        }

        // 合并工具，避免重复
        sourceSecond.tools.forEach(tool => {
          if (!targetSecond!.tools.some(t => t.toolUrl === tool.toolUrl)) {
            targetSecond!.tools.push(tool);
          }
        });
      });

      // 更新时间戳
      if (sourceCategory.lastUpdated > targetCategory.lastUpdated) {
        targetCategory.lastUpdated = sourceCategory.lastUpdated;
      }
    });

    // 更新整体时间戳
    if (source.lastUpdated > target.lastUpdated) {
      target.lastUpdated = source.lastUpdated;
    }
  }

  /**
   * 清理所有增量文件（可选：将增量数据合并到base.json后清理）
   */
  public mergeIncrementalToBase(): void {
    if (!this.incremental) {
      console.log('Not in incremental mode, nothing to merge');
      return;
    }
    
    const allData = this.getAllData();
    this.saveDataToFile(this.baseFilePath, allData);
    
    // 删除所有增量文件
    const incrementalFiles = this.getAllIncrementalFiles();
    incrementalFiles.forEach(file => {
      fs.unlinkSync(file);
      console.log(`Deleted incremental file: ${file}`);
    });
    
    console.log('All incremental data merged to base.json');
  }

  /**
   * 获取数据库统计信息
   */
  public getStats(): {
    totalCategories: number;
    totalSecondCategories: number;
    totalTools: number;
    lastUpdated: string;
    version: string;
    incrementalFiles: number;
  } {
    const allData = this.getAllData();
    
    const totalSecondCategories = allData.categories.reduce(
      (sum, category) => sum + category.secondCategories.length,
      0
    );
    
    const totalTools = allData.categories.reduce(
      (sum, category) =>
        sum +
        category.secondCategories.reduce(
          (subSum, sec) => subSum + sec.tools.length,
          0
        ),
      0
    );

    return {
      totalCategories: allData.categories.length,
      totalSecondCategories,
      totalTools,
      lastUpdated: allData.lastUpdated,
      version: allData.version,
      incrementalFiles: this.incremental ? this.getAllIncrementalFiles().length : 0
    };
  }

  /**
   * 获取所有工具URL（用于爬虫去重）
   */
  public getAllToolUrlsList(): string[] {
    return Array.from(this.getAllToolUrls());
  }

  /**
   * 获取当前模式
   */
  public isIncrementalMode(): boolean {
    return this.incremental;
  }

  /**
   * 切换模式
   */
  public setIncrementalMode(incremental: boolean): void {
    this.incremental = incremental;
  }
}