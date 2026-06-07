import { ActionIcon, Box, Button, Group, Modal, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { ColorPicker } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";

type ColorPickerDialogProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
};

const SWATCHES = [
  "#F03E3E", "#D6336C", "#AE3EC9", "#7048E8", "#4263EB",
  "#1C7ED6", "#1098AD", "#0CA678", "#37B24D", "#74B816",
  "#F59F00", "#F76707", "#5C7CFA", "#4C6EF5", "#364FC7",
  "#343A40", "#495057", "#868E96", "#ADB5BD", "#CED4DA",
  "#E9ECEF", "#FFF3BF", "#FFD8A8", "#FFC9C9", "#C3FAE8",
];

function normalizeHex(value: string): string {
  const raw = value.trim();
  if (!raw) return "#4ecdc4";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

export default function ColorPickerDialog({ value, onChange, label }: ColorPickerDialogProps) {
  const [opened, setOpened] = useState(false);
  const [draftColor, setDraftColor] = useState(value);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraftColor(value);
  }, [value]);

  const displayColor = useMemo(() => normalizeHex(value), [value]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayColor);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [displayColor]);

  return (
    <>
      <Group gap={4} wrap="nowrap">
        <Button
          variant="default"
          onClick={() => {
            setDraftColor(value);
            setOpened(true);
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <Box
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: "1px solid rgba(130, 130, 130, 0.8)",
                background: displayColor,
                flexShrink: 0,
              }}
            />
            <Text size="sm" ff="monospace">{displayColor}</Text>
          </Group>
        </Button>
        <Tooltip label={copied ? "Copied!" : "Copy color to clipboard"} withArrow>
          <ActionIcon
            variant="subtle"
            color={copied ? "green" : "gray"}
            onClick={handleCopy}
            aria-label="Copy color to clipboard"
          >
            {/* Clipboard copy icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={label}
        centered
        withCloseButton
      >
        <Stack>
          <ColorPicker
            format="hex"
            value={draftColor}
            onChange={setDraftColor}
            swatches={SWATCHES}
            swatchesPerRow={5}
            fullWidth
          />

          <TextInput
            label="Hex value"
            value={draftColor}
            onChange={(event) => setDraftColor(normalizeHex(event.currentTarget.value))}
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setDraftColor(value);
                setOpened(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onChange(normalizeHex(draftColor));
                setOpened(false);
              }}
            >
              OK
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
