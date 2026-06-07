import { normalizeTagName, TAG_SYSTEM_MAX_COUNT, validateTagCount, validateTagName } from "../../features/tags/domain/tags";
import { db } from "../db";

export class TagApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TagApiError";
    this.status = status;
  }
}

export type JourneyTagUsage = {
  id: string;
  name: string;
  storyCount: number;
  altitudeInfoCount: number;
  usageCount: number;
};

function requireJourneyId(journeyId: string): string {
  const normalizedJourneyId = journeyId.trim();

  if (!normalizedJourneyId) {
    throw new TagApiError(400, "journeyId is required.");
  }

  return normalizedJourneyId;
}

function toJourneyTagUsage(tag: {
  id: string;
  name: string;
  _count: {
    stories: number;
    altitudeInfos: number;
  };
}): JourneyTagUsage {
  const storyCount = tag._count.stories;
  const altitudeInfoCount = tag._count.altitudeInfos;

  return {
    id: tag.id,
    name: tag.name,
    storyCount,
    altitudeInfoCount,
    usageCount: storyCount + altitudeInfoCount,
  };
}

export async function listJourneyTags(journeyId: string): Promise<JourneyTagUsage[]> {
  const scopedJourneyId = requireJourneyId(journeyId);
  const tags = await db.tag.findMany({
    where: { journeyId: scopedJourneyId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          stories: true,
          altitudeInfos: true,
        },
      },
    },
  });

  return tags.map(toJourneyTagUsage);
}

export async function searchJourneyTags(journeyId: string, query: string): Promise<JourneyTagUsage[]> {
  const scopedJourneyId = requireJourneyId(journeyId);
  const normalizedQuery = normalizeTagName(query);

  if (normalizedQuery.length < 3) {
    return [];
  }

  const tags = await db.tag.findMany({
    where: {
      journeyId: scopedJourneyId,
      name: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
    take: 10,
    include: {
      _count: {
        select: {
          stories: true,
          altitudeInfos: true,
        },
      },
    },
  });

  return tags.map(toJourneyTagUsage);
}

export async function createJourneyTag(journeyId: string, rawName: string): Promise<{ id: string; name: string }> {
  const scopedJourneyId = requireJourneyId(journeyId);
  const validation = validateTagName(rawName);

  if (!validation.valid) {
    throw new TagApiError(400, validation.error ?? "Invalid tag name.");
  }

  const normalizedName = normalizeTagName(rawName);
  const existing = await db.tag.findUnique({ where: { name: normalizedName } });

  if (existing) {
    throw new TagApiError(409, `Tag "${normalizedName}" already exists.`);
  }

  const currentCount = await db.tag.count({ where: { journeyId: scopedJourneyId } });
  const countValidation = validateTagCount(currentCount, 1);

  if (!countValidation.valid) {
    throw new TagApiError(400, countValidation.error ?? `Cannot create more than ${TAG_SYSTEM_MAX_COUNT} unique tags.`);
  }

  const created = await db.tag.create({
    data: {
      name: normalizedName,
      journeyId: scopedJourneyId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return created;
}

export async function renameJourneyTag(
  journeyId: string,
  tagId: string,
  rawName: string,
): Promise<{ id: string; name: string }> {
  const scopedJourneyId = requireJourneyId(journeyId);
  const normalizedTagId = tagId.trim();

  if (!normalizedTagId) {
    throw new TagApiError(400, "tagId is required.");
  }

  const validation = validateTagName(rawName);
  if (!validation.valid) {
    throw new TagApiError(400, validation.error ?? "Invalid tag name.");
  }

  const tag = await db.tag.findFirst({
    where: {
      id: normalizedTagId,
      journeyId: scopedJourneyId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!tag) {
    throw new TagApiError(404, "Tag not found.");
  }

  const normalizedName = normalizeTagName(rawName);
  const existing = await db.tag.findFirst({
    where: {
      name: { equals: normalizedName, mode: "insensitive" },
      NOT: { id: normalizedTagId },
    },
    select: { id: true },
  });

  if (existing) {
    throw new TagApiError(409, `Tag "${normalizedName}" already exists.`);
  }

  if (tag.name === normalizedName) {
    return tag;
  }

  return db.tag.update({
    where: { id: normalizedTagId },
    data: { name: normalizedName },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function deleteJourneyTag(journeyId: string, tagId: string): Promise<{ id: string; name: string }> {
  const scopedJourneyId = requireJourneyId(journeyId);
  const normalizedTagId = tagId.trim();

  if (!normalizedTagId) {
    throw new TagApiError(400, "tagId is required.");
  }

  const tag = await db.tag.findFirst({
    where: {
      id: normalizedTagId,
      journeyId: scopedJourneyId,
    },
    include: {
      _count: {
        select: {
          stories: true,
          altitudeInfos: true,
        },
      },
    },
  });

  if (!tag) {
    throw new TagApiError(404, "Tag not found.");
  }

  const usageCount = tag._count.stories + tag._count.altitudeInfos;
  if (usageCount > 0) {
    throw new TagApiError(
      409,
      `Cannot delete tag "${tag.name}" because it is used by ${usageCount} item(s). Remove the tag from all items first.`,
    );
  }

  return db.tag.delete({
    where: { id: normalizedTagId },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function resolveJourneyTagIds(formData: FormData, journeyId: string): Promise<string[]> {
  const scopedJourneyId = requireJourneyId(journeyId);
  const rawIds = formData
    .getAll("tagIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (rawIds.length === 0) {
    return [];
  }

  const resolvedIds: string[] = [];
  const seenIds = new Set<string>();
  let currentCount = await db.tag.count({ where: { journeyId: scopedJourneyId } });

  for (const rawId of rawIds) {
    let resolvedId: string;

    if (rawId.startsWith("new:")) {
      const rawName = rawId.slice(4).trim();
      const validation = validateTagName(rawName);
      if (!validation.valid) {
        throw new TagApiError(400, validation.error ?? "Invalid tag name.");
      }

      const normalizedName = normalizeTagName(rawName);
      const existing = await db.tag.findUnique({
        where: { name: normalizedName },
        select: { id: true, journeyId: true },
      });

      if (existing) {
        if (existing.journeyId !== scopedJourneyId) {
          throw new TagApiError(409, `Tag "${normalizedName}" already exists in another journey.`);
        }

        resolvedId = existing.id;
      } else {
        const countValidation = validateTagCount(currentCount, 1);
        if (!countValidation.valid) {
          throw new TagApiError(400, countValidation.error ?? `Cannot create more than ${TAG_SYSTEM_MAX_COUNT} unique tags.`);
        }

        const created = await db.tag.create({
          data: {
            name: normalizedName,
            journeyId: scopedJourneyId,
          },
          select: { id: true },
        });
        resolvedId = created.id;
        currentCount += 1;
      }
    } else {
      const existing = await db.tag.findFirst({
        where: {
          id: rawId,
          journeyId: scopedJourneyId,
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TagApiError(400, "One or more selected tags are invalid for this journey.");
      }

      resolvedId = existing.id;
    }

    if (!seenIds.has(resolvedId)) {
      seenIds.add(resolvedId);
      resolvedIds.push(resolvedId);
    }
  }

  return resolvedIds;
}