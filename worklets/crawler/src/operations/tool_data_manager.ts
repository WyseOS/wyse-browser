import fs from 'fs';
import path from 'path';

export interface ToolData {
  toolUrl: string;
  logoUrl: string;
  title: string;
  description: string;
  website: string;
  lastUpdated?: string;
}

interface ToolCategory {
  name: string;
  lastUpdated: string;
  tools: ToolData[];
}

interface ToolDatabase {
  version: string;
  lastUpdated: string;
  categories: ToolCategory[];
}

export class CategorizedToolDataManager {
  private filePath: string;
  private data: ToolDatabase;

  constructor(filePath: string = './data/tools.json') {
    this.filePath = path.resolve(filePath);
    this.data = this.loadData();
  }

  private loadData(): ToolDatabase {
    try {
      if (fs.existsSync(this.filePath)) {
        const rawData = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }

    return {
      version: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      categories: []
    };
  }

  /**
   * 添加或更新分类中的工具
   * @param categoryName 分类名称
   * @param tool 工具数据
   * @param createCategoryIfNotExist 如果分类不存在是否创建（默认true）
   */
  public upsertTool(
    categoryName: string,
    tool: ToolData,
    createCategoryIfNotExist: boolean = true
  ): void {
    const now = new Date().toISOString();
    let category = this.data.categories.find(c => c.name === categoryName);

    if (!category) {
      if (!createCategoryIfNotExist) {
        throw new Error(`Category '${categoryName}' not found`);
      }
      category = {
        name: categoryName,
        lastUpdated: now,
        tools: []
      };
      this.data.categories.push(category);
    }

    const existingToolIndex = category.tools.findIndex(
      t => t.toolUrl === tool.toolUrl
    );

    if (existingToolIndex === -1) {
      category.tools.push({
        ...tool,
        lastUpdated: now
      });
    } else {
      category.tools[existingToolIndex] = {
        ...tool,
        lastUpdated: now
      };
    }

    category.lastUpdated = now;
    this.data.lastUpdated = now;
    this.data.version = now;
  }

  /**
   * 批量添加或更新工具
   */
  public batchUpsertTools(
    categoryName: string,
    tools: ToolData[],
    createCategoryIfNotExist: boolean = true
  ): void {
    tools.forEach(tool => 
      this.upsertTool(categoryName, tool, createCategoryIfNotExist)
    );
  }

  /**
   * 删除分类中的工具
   */
  public removeTool(categoryName: string, toolUrl: string): boolean {
    const category = this.data.categories.find(c => c.name === categoryName);
    if (!category) return false;

    const initialLength = category.tools.length;
    category.tools = category.tools.filter(t => t.toolUrl !== toolUrl);

    if (category.tools.length < initialLength) {
      category.lastUpdated = new Date().toISOString();
      this.data.lastUpdated = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 获取所有分类
   */
  public getAllCategories(): ToolCategory[] {
    return [...this.data.categories];
  }

  /**
   * 获取特定分类的所有工具
   */
  public getToolsByCategory(categoryName: string): ToolData[] | undefined {
    const category = this.data.categories.find(c => c.name === categoryName);
    return category ? [...category.tools] : undefined;
  }

  /**
   * 根据URL查找工具（跨分类搜索）
   */
  public getToolByUrl(toolUrl: string): { category: string; tool: ToolData } | undefined {
    for (const category of this.data.categories) {
      const tool = category.tools.find(t => t.toolUrl === toolUrl);
      if (tool) {
        return {
          category: category.name,
          tool
        };
      }
    }
    return undefined;
  }

  /**
   * 添加新分类
   */
  public addCategory(categoryName: string): void {
    if (this.data.categories.some(c => c.name === categoryName)) {
      throw new Error(`Category '${categoryName}' already exists`);
    }

    const now = new Date().toISOString();
    this.data.categories.push({
      name: categoryName,
      lastUpdated: now,
      tools: []
    });
    this.data.lastUpdated = now;
  }

  /**
   * 删除分类
   */
  public removeCategory(categoryName: string): boolean {
    const initialLength = this.data.categories.length;
    this.data.categories = this.data.categories.filter(
      c => c.name !== categoryName
    );

    if (this.data.categories.length < initialLength) {
      this.data.lastUpdated = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 保存数据到文件
   */
  public saveToFile(): void {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
      console.log(`Data saved to ${this.filePath}`);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  /**
   * 获取数据库统计信息
   */
  public getStats(): {
    totalCategories: number;
    totalTools: number;
    lastUpdated: string;
    version: string;
  } {
    const totalTools = this.data.categories.reduce(
      (sum, category) => sum + category.tools.length,
      0
    );

    return {
      totalCategories: this.data.categories.length,
      totalTools,
      lastUpdated: this.data.lastUpdated,
      version: this.data.version
    };
  }
}