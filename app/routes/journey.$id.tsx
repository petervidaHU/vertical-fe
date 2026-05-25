import { useCallback, useState } from "react";
import { ActionIcon, Button, Group, Modal, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { Link, useLoaderData } from "react-router";
import JourneyPixiTimelineClient from "../features/timeline/pixi/JourneyPixiTimelineClient";
import { db } from "../server/db";

export async function loader({ params }: { params: { id?: string } }) {
  if (!params.id) {
    throw new Response("Missing journey id", { status: 400, statusText: "Bad Request" });
  }

  const journey = await db.journey.findUnique({
    where: { id: params.id },
    include: {
      epics: {
        orderBy: { startPoint: "asc" },
      },
      stories: {
        orderBy: { startPoint: "asc" },
      },
      _count: {
        select: { epics: true, stories: true },
      },
    },
  });

  if (!journey) {
    throw new Response("Journey not found", { status: 404, statusText: "Not Found" });
  }

  return { journey };
}

export default function JourneyPage() {
  const { journey } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const [navOpen, setNavOpen] = useState(false);
  const [scrollMultiplier, setScrollMultiplier] = useState(1);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  const selectedStory = journey.stories.find((story) => story.id === selectedStoryId) ?? null;
  const handleStoryCardClick = useCallback((story: { id: string }) => {
    setSelectedStoryId(story.id);
  }, []);

  return (
    <>
      {/* Suppress body scrollbar for full-screen canvas page */}
      <style>{`html, body { overflow: hidden; margin: 0; padding: 0; }`}</style>

      {/* Full-screen canvas layer */}
      <div style={{ position: "fixed", inset: 0 }}>
        <JourneyPixiTimelineClient
          title={journey.name}
          epics={journey.epics}
          stories={journey.stories}
          startGround={journey.startingPoint}
          wheelMultiplier={scrollMultiplier}
          onStoryCardClick={handleStoryCardClick}
        />
      </div>

      <Modal
        opened={selectedStory !== null}
        onClose={() => setSelectedStoryId(null)}
        title={selectedStory?.title ?? "Story details"}
        size="lg"
        centered
      >
        {selectedStory ? (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {selectedStory.startPoint}m - {selectedStory.endPoint}m
            </Text>
            {selectedStory.description ? <Text>{selectedStory.description}</Text> : null}

            {selectedStory.extraContent ? (
              <ScrollArea.Autosize mah={420}>
                <div
                  style={{
                    lineHeight: 1.65,
                    fontSize: 15,
                    color: "#1f2a37",
                  }}
                  dangerouslySetInnerHTML={{ __html: selectedStory.extraContent }}
                />
              </ScrollArea.Autosize>
            ) : (
              <Text c="dimmed">No extra content added yet.</Text>
            )}
          </Stack>
        ) : null}
      </Modal>

      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 12,
          background: "rgba(7, 17, 29, 0.86)",
          border: "1px solid rgba(42, 70, 98, 0.5)",
          backdropFilter: "blur(12px)",
        }}
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Decrease scroll speed"
          onClick={() => setScrollMultiplier((prev) => Math.max(0.5, prev - 0.5))}
        >
          <span style={{ fontFamily: "monospace", fontSize: 16 }}>˅</span>
        </ActionIcon>

        <div
          style={{
            color: "#f5f7fa",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: 700,
            minWidth: 82,
            textAlign: "center",
          }}
        >
          multiplier: {scrollMultiplier.toFixed(1)}x
        </div>

        <ActionIcon
          variant="subtle"
          color="teal"
          aria-label="Increase scroll speed"
          onClick={() => setScrollMultiplier((prev) => Math.min(8, prev + 0.5))}
        >
          <span style={{ fontFamily: "monospace", fontSize: 16 }}>˄</span>
        </ActionIcon>
      </div>

      {/* Slide-down nav tab */}
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}
        onMouseEnter={() => setNavOpen(true)}
        onMouseLeave={() => setNavOpen(false)}
      >
        {/* Always-visible pill handle */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 48,
              height: 5,
              background: navOpen
                ? "rgba(174, 197, 216, 0.65)"
                : "rgba(174, 197, 216, 0.28)",
              borderRadius: "0 0 6px 6px",
              transition: "background 0.25s",
              cursor: "default",
            }}
          />
        </div>

        {/* Nav panel — expands downward on hover */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: navOpen ? "80px" : "0",
            transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            background: "rgba(7, 17, 29, 0.92)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(42, 70, 98, 0.45)",
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "#f5f7fa",
                  fontFamily: "monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {journey.name}
              </div>
              <div
                style={{
                  color: "#8ba4b8",
                  fontFamily: "monospace",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {journey._count.epics} epics • {journey._count.stories} stories
              </div>
            </div>

            <Group gap="xs">
              <Button
                component={Link}
                to="/journey"
                variant="subtle"
                size="xs"
                color="gray"
              >
                Back to journeys
              </Button>
              <Button
                component={Link}
                to={`/admin/${journey.id}`}
                variant="subtle"
                size="xs"
                color="teal"
              >
                Manage data
              </Button>
            </Group>
          </div>
        </div>
      </div>
    </>
  );
}
