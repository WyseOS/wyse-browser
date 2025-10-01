import type { z } from 'zod'

export type ToolCapability = 'core' | 'core-tabs' | 'core-install' | 'vision' | 'pdf' | 'testing' | 'tracing';

export type ToolSchema<Input extends z.Schema> = {
  name: string;
  title: string;
  description: string;
  inputSchema: Input;
  type: 'readOnly' | 'destructive';
};
