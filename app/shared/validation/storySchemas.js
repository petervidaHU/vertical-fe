import { z } from "zod";
const baseStorySchema = z.object({
    title: z.string().trim().min(1, "Title is required."),
    epicTitle: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value ? value : undefined)),
});
const idSchema = z.object({
    id: z.string().trim().min(1, "Story id is required."),
});
export function parseStoryForm(formData) {
    return baseStorySchema.parse({
        title: String(formData.get("title") ?? ""),
        epicTitle: String(formData.get("epicTitle") ?? ""),
    });
}
export function parseStoryUpdateForm(formData, idParam) {
    const parsedId = idSchema.parse({ id: idParam }).id;
    const parsedStory = parseStoryForm(formData);
    return {
        id: parsedId,
        ...parsedStory,
    };
}
