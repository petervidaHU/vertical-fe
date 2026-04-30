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

export type StoryFormInput = z.infer<typeof baseStorySchema>;
export type StoryUpdateFormInput = z.infer<typeof baseStorySchema> & { id: string };

export function parseStoryForm(formData: FormData): StoryFormInput {
  return baseStorySchema.parse({
    title: String(formData.get("title") ?? ""),
    epicTitle: String(formData.get("epicTitle") ?? ""),
  });
}

export function parseStoryUpdateForm(formData: FormData, idParam: string | undefined): StoryUpdateFormInput {
  const parsedId = idSchema.parse({ id: idParam }).id;
  const parsedStory = parseStoryForm(formData);

  return {
    id: parsedId,
    ...parsedStory,
  };
}
