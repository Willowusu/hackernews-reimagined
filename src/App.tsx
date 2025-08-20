import React, { useEffect, useMemo, useState } from "react";
import { MessageSquare, ArrowUp, ExternalLink, RefreshCw, Clock, User, Globe, Search, ChevronLeft, ChevronRight } from "lucide-react";
// Make sure you've installed your wrapper: `npm i hackernews-js`
import { HNClient } from "hackernews-js";



// ----- Config -----
const client = new HNClient({
  concurrency: 12,
  fetch: window.fetch.bind(window),
});

const PAGE_SIZE = 30;
const CATEGORIES = [
  { key: "top", label: "Top" },
  { key: "new", label: "New" },
  { key: "best", label: "Best" },
  { key: "ask", label: "Ask" },
  { key: "show", label: "Show" },
  { key: "job", label: "Jobs" },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

function timeAgo(date: Date | null) {
  if (!date) return "";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.34524, "w"],
    [12, "mo"],
  ];
  let val = sec;
  let i = 0;
  while (i < units.length && val >= units[i][0]) {
    val = Math.floor(val / units[i][0]);
    i++;
  }
  const unit = ["s", "m", "h", "d", "w", "mo", "y"][i] ?? "y";
  return `${val}${unit} ago`;
}

function domainFromUrl(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function HackerNewsApp() {
  const [category, setCategory] = useState<CategoryKey>("top");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);


  const openComments = async (id: number) => {
    // open modal immediately with a placeholder story
    setSelectedStory({ id, loading: true });
    setStoryLoading(true);

    try {
      const story = await client.getStoryWithComments(id, { maxDepth: 3, maxComments: 50 });
      setSelectedStory(story);
    } catch (e) {
      console.error(e);
    } finally {
      setStoryLoading(false);
    }
  };


  function CommentList({ comments }: { comments: any[] }) {
    return (
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="border-l-2 border-neutral-200 pl-3">
            <div className="text-sm text-neutral-800 mb-1">
              <span className="font-semibold">{c.by || "anon"}</span>{" "}
              <span className="text-neutral-500">{timeAgo(client.toDate(c.time))}</span>
            </div>
            <div
              className="prose prose-sm text-neutral-900"
              dangerouslySetInnerHTML={{ __html: c.text || "" }}
            />
            {c.comments?.length > 0 && (
              <div className="mt-2 pl-3 border-l border-neutral-200">
                <CommentList comments={c.comments} />
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  function CommentSkeleton() {
    return (
      <ul className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="border-l-2 border-neutral-200 pl-3 animate-pulse">
            <div className="h-4 w-24 bg-neutral-200 rounded mb-2" />
            <div className="h-3 w-full bg-neutral-200 rounded mb-1" />
            <div className="h-3 w-2/3 bg-neutral-200 rounded" />
          </li>
        ))}
      </ul>
    );
  }



  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.title || "").toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setItems([]); // 👈 clear items immediately so skeletons show
        const { items: list, total } = await client.getListPage(category, page, PAGE_SIZE);
        if (!mounted) return;
        setItems(list);
        setTotal(total);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load stories");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [category, page, reloadKey]);   // 👈 include reloadKey

  useEffect(() => {
    console.log("Current page:", page);
  }, [page]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reload = () => {
    setPage(1);
    setReloadKey((k) => k + 1); // force new fetch
  };


  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white font-bold">HN</span>
            <h1 className="text-xl font-semibold">HackerNews — Reimagined</h1>
          </div>

          <nav className="ml-6 hidden md:flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCategory(c.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${category === c.key ? "bg-neutral-900 text-white border-neutral-900" : "bg-white hover:bg-neutral-100 border-neutral-200"}`}
                aria-pressed={category === c.key}
              >
                {c.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                className="pl-9 pr-3 py-2 rounded-xl border border-neutral-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 w-64"
                placeholder="Search titles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button onClick={reload} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Small-screen category pills */}
        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCategory(c.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${category === c.key ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-neutral-600">{loading ? "Loading…" : `${total || "?"} stories • ${category.toUpperCase()}`}</div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-neutral-700">Page {page} / {maxPage}</span>
            <button
              disabled={page >= maxPage}
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-800 p-3">{error}</div>
        )}

        {/* Feed */}
        <ul className="grid grid-cols-1 gap-3">
          {loading && items.length === 0 && (
            Array.from({ length: 10 }).map((_, i) => (
              <li key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 animate-pulse">
                <div className="h-5 w-2/3 bg-neutral-200 rounded mb-2" />
                <div className="h-4 w-1/3 bg-neutral-200 rounded" />
              </li>
            ))
          )}

          {!loading && filtered.map((it) => (
            <StoryCard key={it.id} item={it} onOpenComments={openComments} />
          ))}
        </ul>
      </main>

      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedStory.title || "Loading…"}
              </h2>
              <button
                onClick={() => setSelectedStory(null)}
                className="px-3 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300"
              >
                Close
              </button>
            </div>

            {storyLoading ? (
              <CommentSkeleton />
            ) : selectedStory.comments?.length > 0 ? (
              <CommentList comments={selectedStory.comments} />
            ) : (
              <p className="text-neutral-500">No comments</p>
            )}
          </div>
        </div>
      )}



      <footer className="border-t bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-600 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>
            Built with <code className="px-1 py-0.5 rounded bg-neutral-100">hackernews-js</code>. Source on <a className="underline" href="https://github.com/yourusername/hackernews-js" target="_blank" rel="noreferrer">GitHub</a>.
          </div>
          <div>
            Not affiliated with Y Combinator / Hacker News.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StoryCard({ item, onOpenComments }: { item: any, onOpenComments: (id: number) => void }) {
  const domain = domainFromUrl(item.url);
  const posted = timeAgo(client.toDate(item.time));

  const openExternal = () => {
    const href = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
    window.open(href, "_blank");
  };

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center w-10">
          <ArrowUp className="h-5 w-5" />
          <div className="text-sm font-semibold">{item.score ?? 0}</div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-snug">
            <button onClick={openExternal} className="hover:underline text-left">
              {item.title || "Untitled"}
            </button>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{posted}</span>
            {domain && <span className="inline-flex items-center gap-1"><Globe className="h-4 w-4" />{domain}</span>}
            {item.by && <span className="inline-flex items-center gap-1"><User className="h-4 w-4" />{item.by}</span>}
            <button onClick={() => onOpenComments(item.id)} className="inline-flex items-center gap-1 hover:underline">
              <MessageSquare className="h-4 w-4" />
              {item.descendants ?? (item.kids?.length ?? 0)} comments
            </button>
          </div>
        </div>
        <button onClick={openExternal} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100">
          Read <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

