import { Box, Group, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { STORY_EXTRA_CONTENT_MAX_LENGTH } from "../../../shared/validation/storySchemas";

type StoryExtraContentEditorProps = {
  name: string;
  initialValue?: string;
  label?: string;
  description?: string;
};

export default function StoryExtraContentEditor({
  name,
  initialValue = "",
  label = "Extra content",
  description = "Rich text shown in the journey story modal.",
}: StoryExtraContentEditorProps) {
  const [value, setValue] = useState(initialValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialValue,
    onUpdate: ({ editor: currentEditor }) => {
      setValue(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    setValue(initialValue);
    if (!editor) return;

    const normalizedCurrent = editor.getHTML();
    if (normalizedCurrent !== initialValue) {
      editor.commands.setContent(initialValue, { emitUpdate: false });
    }
  }, [editor, initialValue]);

  const remaining = STORY_EXTRA_CONTENT_MAX_LENGTH - value.length;
  const isOverLimit = remaining < 0;

  return (
    <Box>
      <input type="hidden" name={name} value={value} />

      <Group justify="space-between" align="end" mb={6}>
        <div>
          <Text size="sm" fw={500}>{label}</Text>
          <Text size="xs" c="dimmed">{description}</Text>
        </div>
        <Text size="xs" c={isOverLimit ? "red" : "dimmed"}>
          {value.length} / {STORY_EXTRA_CONTENT_MAX_LENGTH}
        </Text>
      </Group>

      <RichTextEditor editor={editor} variant="subtle">
        <RichTextEditor.Toolbar sticky stickyOffset={0}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Blockquote />
            <RichTextEditor.CodeBlock />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content
          style={{
            minHeight: 220,
            border: "1px solid rgba(134, 142, 150, 0.35)",
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.75)",
            padding: 12,
          }}
        />
      </RichTextEditor>
    </Box>
  );
}
