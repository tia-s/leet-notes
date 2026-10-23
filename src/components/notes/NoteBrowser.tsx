import { useState, useMemo } from 'react';
import type { CollectionEntry } from 'astro:content';

interface NoteBrowserProps {
  notes: CollectionEntry<'notes'>[];
  initialCategory?: string;
}

export default function NoteBrowser({ notes, initialCategory = 'all' }: NoteBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter and sort notes based on the server-provided initialCategory and local search/sort state
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        const matchesCategory =
          initialCategory === 'all' || note.data.category === initialCategory;

        const matchesSearch =
          searchQuery.trim() === '' ||
          note.data.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.data.summary.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.data.date).getTime();
        const dateB = new Date(b.data.date).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [notes, initialCategory, searchQuery, sortOrder]);

  const algoCount = notes.filter((n) => n.data.category === 'algorithm').length;
  const sysCount = notes.filter((n) => n.data.category === 'system-design').length;
  const lowLevelCount = notes.filter((n) => n.data.category === 'low-level-systems').length;

  return (
    <div className="space-y-6">
      {/* Controls Bar: Tabs, Search, and Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        {/* Category Tabs as real paths to sync with Sidebar and Topbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <a
            href="/"
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              initialCategory === 'all'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>All notes</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400">
              {notes.length}
            </span>
          </a>

          <a
            href="/category/algorithm"
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              initialCategory === 'algorithm'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>Coding problems</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400">
              {algoCount}
            </span>
          </a>

          <a
            href="/category/system-design"
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              initialCategory === 'system-design'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>System design</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400">
              {sysCount}
            </span>
          </a>

          <a
            href="/category/low-level-systems"
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              initialCategory === 'low-level-systems'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>Low Level Systems</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400">
              {lowLevelCount}
            </span>
          </a>
        </div>

        {/* Search Input & Sort Selector */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="bg-zinc-900/80 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Note Count Status */}
      <div className="text-xs font-mono text-zinc-500">
        Showing {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} in the journal
      </div>

      {/* Note Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.map((note) => {
          const { title, summary, category, tags, date } = note.data;
          const formattedDate = new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <a
              key={note.id}
              href={`/notes/${note.id}`}
              className="group bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-5 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* Updated Minimal Icon Category Header */}
                  <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase">
                    {category === 'algorithm' ? (
                      <>
                        <span className="text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </span>
                        <span className="text-emerald-400 font-medium text-xs">Coding problem</span>
                      </>
                    ) : category === 'system-design' ? (
                      <>
                        <span className="text-purple-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="text-purple-400 font-medium text-xs">System design</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sky-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                          </svg>
                        </span>
                        <span className="text-sky-400 font-medium text-xs">Low Level Systems</span>
                      </>
                    )}
                  </div>
                </div>

                <h2 className="text-lg font-medium text-zinc-100 group-hover:text-emerald-300 transition-colors">
                  {title}
                </h2>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {summary}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-3">
                  <span>6 min read</span>
                  <span>{formattedDate}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400 font-mono">No notes found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}