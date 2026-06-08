import { getStoryVisibilityBand, type StoryAltitudeRange } from "./storyPresentation";

export type StableCardColumnItem = StoryAltitudeRange & {
  id: string;
};

type StableCardColumnAssignmentOptions = {
  cardWidth: number;
  columnGap?: number;
  leftInset?: number;
  rightInset?: number;
};

type ColumnState = {
  lastExitAltitude: number;
};

const DEFAULT_COLUMN_GAP = 24;
const DEFAULT_SIDE_INSET = 16;

export function buildStableCardColumnAssignments(
  items: StableCardColumnItem[],
  rendererWidth: number,
  options: StableCardColumnAssignmentOptions,
): Map<string, number> {
  const assignments = new Map<string, number>();

  if (items.length === 0) {
    return assignments;
  }

  const cardWidth = options.cardWidth;
  const columnGap = options.columnGap ?? DEFAULT_COLUMN_GAP;
  const leftInset = options.leftInset ?? DEFAULT_SIDE_INSET;
  const rightInset = options.rightInset ?? DEFAULT_SIDE_INSET;
  const availableWidth = Math.max(cardWidth, rendererWidth - leftInset - rightInset);
  const maxColumnsThatFit = Math.max(
    1,
    Math.floor((Math.max(cardWidth, availableWidth) + columnGap) / (cardWidth + columnGap)),
  );

  const normalizedItems = [...items]
    .map((item) => {
      const band = getStoryVisibilityBand(item);

      return {
        ...item,
        entryStart: band.entryStart,
        exitEnd: band.exitEnd,
      };
    })
    .sort((left, right) => {
      if (left.entryStart !== right.entryStart) {
        return left.entryStart - right.entryStart;
      }

      if (left.exitEnd !== right.exitEnd) {
        return left.exitEnd - right.exitEnd;
      }

      return left.startPoint - right.startPoint;
    });

  const columns: ColumnState[] = [];

  normalizedItems.forEach((item) => {
    let columnIndex = columns.findIndex((column) => item.entryStart >= column.lastExitAltitude);

    if (columnIndex === -1 && columns.length < maxColumnsThatFit) {
      columns.push({
        lastExitAltitude: Number.NEGATIVE_INFINITY,
      });
      columnIndex = columns.length - 1;
    }

    if (columnIndex === -1) {
      columnIndex = columns.reduce((bestIndex, column, index, collection) => {
        if (index === 0) {
          return 0;
        }

        return column.lastExitAltitude < collection[bestIndex].lastExitAltitude ? index : bestIndex;
      }, 0);
    }

    columns[columnIndex].lastExitAltitude = Math.max(columns[columnIndex].lastExitAltitude, item.exitEnd);
    assignments.set(item.id, columnIndex);
  });

  return assignments;
}