import fs from 'fs';
import path from 'path';

export interface SecondCategoryItem {
  name: string;
  url: string;
  count: number;
}

export interface CategoryItem {
  name: string;
  lastUpdated: string;
  secondCategories: SecondCategoryItem[];
}

export interface CategoryDatabase {
  version: string;
  lastUpdated: string;
  categories: CategoryItem[];
}

export class CategoryDataManager {
  private filePath: string;
  private data: CategoryDatabase;

  constructor(filePath: string = './data/categories.json') {
    this.filePath = path.resolve(filePath);
    this.data = this.loadData();
  }

  private loadData(): CategoryDatabase {
    try {
      if (fs.existsSync(this.filePath)) {
        const rawData = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error(`Error loading categories from ${this.filePath}:`, error);
    }

    return {
      version: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      categories: []
    };
  }

  private saveData(): void {
    try {
      // 确保目录存在
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.filePath,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
      console.log(`Categories saved to ${this.filePath}`);
    } catch (error) {
      console.error(`Error saving categories to ${this.filePath}:`, error);
    }
  }

  /**
   * 添加或更新一级分类
   */
  public upsertCategory(categoryName: string): CategoryItem {
    const now = new Date().toISOString();
    
    let category = this.data.categories.find(c => c.name === categoryName);
    if (!category) {
      category = {
        name: categoryName,
        lastUpdated: now,
        secondCategories: []
      };
      this.data.categories.push(category);
    }

    this.data.lastUpdated = now;
    this.data.version = now;
    this.saveData();
    
    return category;
  }

  /**
   * 添加或更新二级分类
   */
  public upsertSecondCategory(
    categoryName: string,
    secondCategory: SecondCategoryItem
  ): void {
    const now = new Date().toISOString();
    
    let category = this.data.categories.find(c => c.name === categoryName);
    if (!category) {
      category = {
        name: categoryName,
        lastUpdated: now,
        secondCategories: []
      };
      this.data.categories.push(category);
    }

    // 检查二级分类是否已存在
    const existingIndex = category.secondCategories.findIndex(
      sc => sc.name === secondCategory.name
    );

    if (existingIndex >= 0) {
      category.secondCategories[existingIndex] = secondCategory;
    } else {
      category.secondCategories.push(secondCategory);
    }

    category.lastUpdated = now;
    this.data.lastUpdated = now;
    this.data.version = now;
    this.saveData();
  }

  /**
   * 批量添加二级分类到指定的一级分类
   */
  public batchUpsertSecondCategories(
    categoryName: string,
    secondCategories: SecondCategoryItem[]
  ): void {
    secondCategories.forEach(secondCat => {
      this.upsertSecondCategory(categoryName, secondCat);
    });
  }

  /**
   * 获取所有分类
   */
  public getAllCategories(): CategoryItem[] {
    return [...this.data.categories];
  }

  /**
   * 根据一级分类名称获取分类
   */
  public getCategoryByName(name: string): CategoryItem | undefined {
    return this.data.categories.find(c => c.name === name);
  }

  /**
   * 获取特定一级分类下的所有二级分类
   */
  public getSecondCategories(categoryName: string): SecondCategoryItem[] | undefined {
    const category = this.data.categories.find(c => c.name === categoryName);
    return category ? [...category.secondCategories] : undefined;
  }

  /**
   * 根据二级分类名称获取信息
   */
  public getSecondCategoryByName(
    categoryName: string,
    secondCategoryName: string
  ): SecondCategoryItem | undefined {
    const category = this.data.categories.find(c => c.name === categoryName);
    if (!category) return undefined;
    
    return category.secondCategories.find(sc => sc.name === secondCategoryName);
  }

  /**
   * 删除一级分类
   */
  public removeCategory(categoryName: string): boolean {
    const initialLength = this.data.categories.length;
    this.data.categories = this.data.categories.filter(c => c.name !== categoryName);
    
    if (this.data.categories.length < initialLength) {
      this.data.lastUpdated = new Date().toISOString();
      this.data.version = new Date().toISOString();
      this.saveData();
      return true;
    }
    return false;
  }

  /**
   * 删除二级分类
   */
  public removeSecondCategory(
    categoryName: string,
    secondCategoryName: string
  ): boolean {
    const category = this.data.categories.find(c => c.name === categoryName);
    if (!category) return false;

    const initialLength = category.secondCategories.length;
    category.secondCategories = category.secondCategories.filter(
      sc => sc.name !== secondCategoryName
    );

    if (category.secondCategories.length < initialLength) {
      category.lastUpdated = new Date().toISOString();
      this.data.lastUpdated = new Date().toISOString();
      this.data.version = new Date().toISOString();
      this.saveData();
      return true;
    }
    return false;
  }

  /**
   * 清空所有数据
   */
  public clear(): void {
    const now = new Date().toISOString();
    this.data = {
      version: now,
      lastUpdated: now,
      categories: []
    };
    this.saveData();
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    totalCategories: number;
    totalSecondCategories: number;
    lastUpdated: string;
    version: string;
  } {
    const totalSecondCategories = this.data.categories.reduce(
      (sum, category) => sum + category.secondCategories.length,
      0
    );

    return {
      totalCategories: this.data.categories.length,
      totalSecondCategories,
      lastUpdated: this.data.lastUpdated,
      version: this.data.version
    };
  }

  /**
   * 重新加载数据
   */
  public reload(): void {
    this.data = this.loadData();
  }

  /**
   * 获取所有二级分类（扁平化）
   */
  public getAllSecondCategories(): Array<{ 
    parentCategory: string; 
    secondCategory: SecondCategoryItem 
  }> {
    const result: Array<{ 
      parentCategory: string; 
      secondCategory: SecondCategoryItem 
    }> = [];

    this.data.categories.forEach(category => {
      category.secondCategories.forEach(secondCat => {
        result.push({
          parentCategory: category.name,
          secondCategory: secondCat
        });
      });
    });

    return result;
  }
}