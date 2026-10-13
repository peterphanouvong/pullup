import MarkdownDisplay from 'react-native-markdown-display';

export function Markdown({ children }: { children: string }) {
  return <MarkdownDisplay>{children}</MarkdownDisplay>;
}
