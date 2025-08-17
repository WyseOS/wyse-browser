import { z } from "zod";

/**
 * Zod schema for the JSON output of Toolify category crawling.
 * This schema validates the overall payload that is returned by the crawler.
 */
const toolItemSchema = z.object({
    toolUrl: z.string().min(1),
    logoUrl: z.string().optional().default(""),
    title: z.string().min(1),
    description: z.string().optional().default(""),
    websiteUrl: z.string().optional().default("")
});

const secondCategorySchema = z.object({
    parentName: z.string().min(1),
    name: z.string().min(1),
    url: z.string().min(1),
    count: z.number().int().nonnegative()
});

const categoryWithItemsSchema = secondCategorySchema.extend({
    items: z.array(toolItemSchema)
});

export const ToolifyCategoryOutputSchema = z.object({
    source: z.literal("https://www.toolify.ai/category"),
    fetchedAt: z.string().datetime(),
    totalCategories: z.number().int().nonnegative(),
    categories: z.array(categoryWithItemsSchema)
});
