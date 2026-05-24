import { z } from "zod";

export const STORY_EXTRA_CONTENT_MAX_LENGTH = 12000;

const extraContentSchema = z
  .string()
  .max(STORY_EXTRA_CONTENT_MAX_LENGTH, `Extra content must be ${STORY_EXTRA_CONTENT_MAX_LENGTH} characters or fewer.`)
  .transform((value) => value.replace(/\r\n/g, "\n").trim());

const baseStorySchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  epicTitle: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  extraContent: extraContentSchema.optional().transform((value) => value ?? ""),
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
    extraContent: String(formData.get("extraContent") ?? ""),
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

export function parseStoryExtraContent(formData: FormData): string {
  return extraContentSchema.parse(String(formData.get("extraContent") ?? ""));
}
