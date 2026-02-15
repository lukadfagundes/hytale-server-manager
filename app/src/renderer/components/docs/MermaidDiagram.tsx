import { useEffect, useState, useRef } from 'react';

let idCounter = 0;

interface Props {
  code: string;
}

export default function MermaidDiagram({ code }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function render() {
      try {
        const mermaid = await import('mermaid');
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#2d2d5e',
            primaryTextColor: '#eaeaea',
            primaryBorderColor: '#4a4a8a',
            lineColor: '#4a4a8a',
            secondaryColor: '#1a1a3e',
            tertiaryColor: '#161630',
            fontFamily: 'ui-monospace, monospace',
          },
        });

        const id = `mermaid-diagram-${idCounter++}`;
        const { svg: rendered } = await mermaid.default.render(id, code);

        if (!cancelled && mountedRef.current) {
          setSvg(rendered);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setLoading(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="animate-pulse bg-hytale-dark rounded-lg p-4 text-hytale-muted text-sm mb-4">
        Loading diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
        <p className="text-xs text-red-400 mb-2">Diagram render error: {error}</p>
        <pre className="text-xs text-hytale-muted font-mono overflow-x-auto">{code}</pre>
      </div>
    );
  }

  if (svg) {
    return (
      <div
        role="img"
        aria-label="Diagram"
        className="overflow-x-auto mb-4 rounded-lg bg-hytale-dark/50 p-4"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return null;
}
