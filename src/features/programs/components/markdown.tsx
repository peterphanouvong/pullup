import MarkdownDisplay, { type MarkdownProps } from 'react-native-markdown-display';
import { StyleSheet } from 'react-native-unistyles';

export function Markdown({ children }: { children: string }) {
  // Unistyles' create() return type isn't structurally RN's NamedStyles; runtime shape matches what the renderer merges.
  return <MarkdownDisplay style={styles as unknown as MarkdownProps['style']}>{children}</MarkdownDisplay>;
}

const styles = StyleSheet.create((theme) => ({
  body: { ...theme.type.body, color: theme.colors.text },
  heading1: { ...theme.type.title, color: theme.colors.text },
  heading2: { ...theme.type.heading, color: theme.colors.text },
  heading3: { ...theme.type.heading, color: theme.colors.text },
  heading4: { ...theme.type.heading, color: theme.colors.text },
  heading5: { ...theme.type.heading, color: theme.colors.text },
  heading6: { ...theme.type.heading, color: theme.colors.text },
  strong: { color: theme.colors.text },
  em: { color: theme.colors.text },
  link: { color: theme.colors.accent },
  table: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
  },
  tr: { borderBottomWidth: 1, borderColor: theme.colors.border },
  th: { ...theme.type.caption, color: theme.colors.text, padding: theme.spacing.xs },
  td: { ...theme.type.body, color: theme.colors.text, padding: theme.spacing.xs },
  hr: { backgroundColor: theme.colors.border },
  blockquote: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
  code_inline: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
  code_block: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
  fence: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
}));
