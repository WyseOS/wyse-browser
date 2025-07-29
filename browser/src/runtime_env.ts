import fs from 'fs';
import { MetadataType } from './constants';

export class RuntimeEnv {
  // key: worklet name, value: worklet JSON
  private workletMetadata: Map<string, any>;

  constructor() {
    this.workletMetadata = new Map();
    this.loadMetadata();
  }

  private loadMetadata() {
    const worklets = fs.readdirSync('../configs/worklets').filter(name => name !== 'README.md');

    for (const workletDir of worklets) {
      try {
        const manifestPath = `../configs/worklets/${workletDir}/manifest.json`;
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        this.workletMetadata.set(manifest.name, manifest);
      } catch (err) {
        console.error(`Failed to load manifest for worklet ${workletDir}:`, err);
      }
    }
  }

  hasAction(worklet: string, action: string): boolean {
    const workletMeta = this.workletMetadata.get(worklet);
    if (workletMeta && Array.isArray(workletMeta.actions)) {
      for (const a of workletMeta.actions) {
        if (a.name === action) {
          return true;
        }
      }
    }
    return false;
  }

  getMetadata(type: MetadataType, worklet: string, action?: string): any {
    const workletMeta = this.workletMetadata.get(worklet);
    if (!workletMeta || !Array.isArray(workletMeta.actions)) {
      console.warn(`No valid metadata found for worklet ${worklet}`);
      return null;
    }

    switch (type) {
      case MetadataType.WORKLET:
        return workletMeta;
      case MetadataType.ACTION:
        for (const a of workletMeta.actions) {
          if (a.name === action) {
            return a;
          }
        }
        return null;
      default:
        throw new Error(`Unknown metadata type: ${type}`);
    }
  }
}
