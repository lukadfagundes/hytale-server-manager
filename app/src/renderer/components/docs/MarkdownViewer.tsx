import { useCallback } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import MermaidDiagram from './MermaidDiagram';

interface Props {
  content: string;
  basePath: string;
}

export default function MarkdownViewer({ content, basePath }: Props) {
  const navigate = useNavigate();

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string | undefined) => {
      if (!href) return;

      // External links
      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault();
        window.open(href, '_blank');
        return;
      }

      // Anchor links
      if (href.startsWith('#')) return;

      // Relative .md links
      if (href.endsWith('.md')) {
        e.preventDefault();
        let resolved: string;

        if (href.startsWith('../')) {
          // Cross-category link: ../architecture/data-flow.md -> /docs/architecture/data-flow
          const stripped = href.replace(/^(\.\.\/)+/, '');
          const slug = stripped.replace(/\.md$/, '');
          resolved = `/docs/${slug}`;
        } else if (href.includes('/')) {
          // Path with category: architecture/data-flow.md -> /docs/architecture/data-flow
          const slug = href.replace(/\.md$/, '');
          resolved = `/docs/${slug}`;
        } else {
          // Same-category link: data-flow.md -> basePath/data-flow
          const slug = href.replace(/\.md$/, '');
          resolved = `${basePath}/${slug}`;
        }

        navigate(resolved);
      }
    },
    [basePath, navigate]
  );

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-hytale-text mt-8 mb-4 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold text-hytale-text mt-6 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-hytale-text mt-4 mb-2">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-hytale-text mt-3 mb-1">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-sm text-hytale-text/90 leading-relaxed mb-3">{children}</p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-hytale-highlight hover:underline"
        onClick={(e) => handleLinkClick(e, href)}
      >
        {children}
      </a>
    ),
    pre: ({ children }) => (
      <pre className="bg-hytale-darker rounded-lg p-4 overflow-x-auto mb-4">{children}</pre>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.startsWith('language-');
      const lang = className?.replace('language-', '');

      if (lang === 'mermaid') {
        const codeText = String(children).replace(/\n$/, '');
        return <MermaidDiagram code={codeText} />;
      }

      if (isBlock) {
        return <code className="text-sm font-mono text-hytale-text/80">{children}</code>;
      }

      return (
        <code className="bg-hytale-accent/20 text-hytale-highlight px-1.5 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="bg-hytale-dark border border-hytale-accent/30 px-3 py-2 text-left font-semibold text-hytale-text">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-hytale-accent/20 px-3 py-2 text-sm text-hytale-text/90">
        {children}
      </td>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-hytale-text/90">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-hytale-text/90">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="text-hytale-text/90">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-hytale-highlight/50 pl-4 italic text-hytale-muted mb-3">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-hytale-accent/30 my-6" />,
    strong: ({ children }) => (
      <strong className="font-semibold text-hytale-text">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-hytale-text/80">{children}</em>,
    img: ({ src, alt }) => <img src={src} alt={alt ?? ''} className="max-w-full rounded-lg my-4" />,
  };

  return (
    <article className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
