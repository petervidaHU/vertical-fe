import { describe, expect, it } from "vitest";
import { mapStoriesDtoToDomain, mapStoryDtoToDomain } from "./mappers";

describe("story mappers", () => {
  it("maps a single dto to domain model", () => {
    const dto = {
      id: "1",
      title: "Story one",
      epicTitle: "Epic A",
      passed: true,
    };

    expect(mapStoryDtoToDomain(dto)).toEqual({
      id: "1",
      title: "Story one",
      epicTitle: "Epic A",
      isPassed: true,
    });
  });

  it("normalizes optional fields", () => {
    const dto = {
      id: "2",
      title: "Story two",
    };

    expect(mapStoryDtoToDomain(dto)).toEqual({
      id: "2",
      title: "Story two",
      epicTitle: "",
      isPassed: false,
    });
  });

  it("maps arrays consistently", () => {
    const dtos = [
      { id: "1", title: "A", passed: true },
      { id: "2", title: "B", passed: false },
    ];

    expect(mapStoriesDtoToDomain(dtos)).toEqual([
      { id: "1", title: "A", epicTitle: "", isPassed: true },
      { id: "2", title: "B", epicTitle: "", isPassed: false },
    ]);
  });
});
