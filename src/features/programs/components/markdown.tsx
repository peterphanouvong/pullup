import { StyleSheet } from 'react-native';
import MarkdownDisplay, { type MarkdownProps } from 'react-native-markdown-display';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

export function Markdown({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  // RN's create() return type isn't structurally NamedStyles for this component's purposes; runtime shape matches what the renderer merges.
  return <MarkdownDisplay style={styles as unknown as MarkdownProps['style']}>{children}</MarkdownDisplay>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  body: { ...theme.type.body, color: theme.colors.ink },
  heading1: { ...theme.type.title, color: theme.colors.ink },
  heading2: { ...theme.type.heading, color: theme.colors.ink },
  heading3: { ...theme.type.heading, color: theme.colors.ink },
  heading4: { ...theme.type.heading, color: theme.colors.ink },
  heading5: { ...theme.type.heading, color: theme.colors.ink },
  heading6: { ...theme.type.heading, color: theme.colors.ink },
  strong: { color: theme.colors.ink },
  em: { color: theme.colors.ink },
  link: { color: theme.colors.accent },
  table: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
  },
  tr: { borderBottomWidth: 1, borderColor: theme.colors.border },
  th: { ...theme.type.caption, color: theme.colors.ink, padding: theme.spacing.xs },
  td: { ...theme.type.body, color: theme.colors.ink, padding: theme.spacing.xs },
  hr: { backgroundColor: theme.colors.border },
  blockquote: {
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
    borderColor: theme.colors.border,
  },
  code_inline: {
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
    borderColor: theme.colors.border,
  },
  code_block: {
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
    borderColor: theme.colors.border,
  },
  fence: {
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
    borderColor: theme.colors.border,
  },
});
