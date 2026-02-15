import { Routes, Route, useParams, Link } from 'react-router-dom';
import { getCategories, getDocsByCategory, getDoc, getCategoryLabel } from '../utils/docs';
import DocsSidebar from '../components/docs/DocsSidebar';
import MarkdownViewer from '../components/docs/MarkdownViewer';

function DocsIndex() {
  const categories = getCategories();

  return (
    <div className="space-y-6">
      <p className="text-sm text-hytale-muted">
        Browse technical documentation for the Hytale Server Manager codebase.
      </p>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            to={`/docs/${cat.name}`}
            className="block bg-hytale-dark border border-hytale-accent/30 rounded-lg p-4 hover:border-hytale-highlight/50 transition-colors"
          >
            <h3 className="text-base font-semibold text-hytale-text mb-1">{cat.label}</h3>
            <p className="text-xs text-hytale-muted">
              {cat.count} {cat.count === 1 ? 'document' : 'documents'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryView() {
  const { category } = useParams<{ category: string }>();
  if (!category) return null;

  const docs = getDocsByCategory(category);
  const label = getCategoryLabel(category);

  if (docs.length === 0) {
    return (
      <div className="space-y-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-hytale-muted">
            <li>
              <Link to="/docs" className="hover:text-hytale-text transition-colors">
                Docs
              </Link>
            </li>
            <li>/</li>
            <li className="text-hytale-text">{label}</li>
          </ol>
        </nav>
        <p className="text-hytale-muted">Category not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-hytale-muted">
          <li>
            <Link to="/docs" className="hover:text-hytale-text transition-colors">
              Docs
            </Link>
          </li>
          <li>/</li>
          <li className="text-hytale-text">{label}</li>
        </ol>
      </nav>
      <div className="space-y-2">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            to={`/docs/${category}/${doc.slug}`}
            className="block bg-hytale-dark border border-hytale-accent/30 rounded-lg p-4 hover:border-hytale-highlight/50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-hytale-text mb-1">{doc.title}</h3>
            {doc.preview && <p className="text-xs text-hytale-muted line-clamp-2">{doc.preview}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DocumentView() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  if (!category || !slug) return null;

  const doc = getDoc(category, slug);
  const label = getCategoryLabel(category);

  if (!doc) {
    return (
      <div className="space-y-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-hytale-muted">
            <li>
              <Link to="/docs" className="hover:text-hytale-text transition-colors">
                Docs
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to={`/docs/${category}`} className="hover:text-hytale-text transition-colors">
                {label}
              </Link>
            </li>
            <li>/</li>
            <li className="text-hytale-text">{slug}</li>
          </ol>
        </nav>
        <p className="text-hytale-muted">Document not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-hytale-muted">
          <li>
            <Link to="/docs" className="hover:text-hytale-text transition-colors">
              Docs
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link to={`/docs/${category}`} className="hover:text-hytale-text transition-colors">
              {label}
            </Link>
          </li>
          <li>/</li>
          <li className="text-hytale-text">{doc.title}</li>
        </ol>
      </nav>
      <MarkdownViewer content={doc.content} basePath={`/docs/${category}`} />
    </div>
  );
}

export default function Docs() {
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold mb-4">Developer Documentation</h1>
      <div className="flex flex-1 gap-6 min-h-0">
        <DocsSidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<DocsIndex />} />
            <Route path=":category" element={<CategoryView />} />
            <Route path=":category/:slug" element={<DocumentView />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
