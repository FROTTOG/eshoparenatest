import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Post } from "../api";
import { OptimizedImg } from "../components/OptimizedImg";
import { useStore } from "../store";
import { useSeo } from "../title";

function dateOnly(s: string): string {
  const d = new Date(String(s || "").replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return String(s || "").slice(0, 10);
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long" }).format(d);
}

function tagList(tags: string): string[] {
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Výpis článků magazínu. */
export function BlogList() {
  const { settings } = useStore();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tag, setTag] = useState("");
  const title = settings.blog_title || "Magazín";

  useSeo({
    title: `${title} — KAVKA`,
    description: settings.blog_perex || "Články z ateliéru: péče o keramiku, len i dřevo, novinky a návody.",
  });

  useEffect(() => {
    setPosts(null);
    void api<{ items: Post[] }>(`/posts${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`)
      .then((r) => setPosts(r.items || []))
      .catch(() => setPosts([]));
  }, [tag]);

  const tags = Array.from(new Set((posts || []).flatMap((p) => tagList(p.tags)))).slice(0, 10);

  return (
    <div className="wrap blog">
      <div className="crumbs">
        <Link to="/">Domů</Link> / <span>{title}</span>
      </div>
      <header className="blog-head">
        <p className="kicker">Čtení z ateliéru</p>
        <h1 className="serif">{title}</h1>
        <p className="blog-perex">{settings.blog_perex || "Návody, péče o materiály a novinky z dílny."}</p>
      </header>

      {(tags.length > 0 || tag) && (
        <div className="blog-tags">
          <button type="button" className={`chip${tag ? "" : " on"}`} onClick={() => setTag("")}>
            Vše
          </button>
          {tags.map((t) => (
            <button key={t} type="button" className={`chip${tag === t ? " on" : ""}`} onClick={() => setTag(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {posts === null && <p className="empty">Načítám články…</p>}
      {posts?.length === 0 && <p className="empty">Zatím tu nic není. Brzy přibude první článek.</p>}

      <div className="blog-grid">
        {(posts || []).map((post) => (
          <article className="blog-card" key={post.id}>
            <Link to={`/magazin/${post.slug}`} className="blog-card-img" aria-label={post.title}>
              <OptimizedImg src={post.cover || "/hero.webp"} alt="" width={640} height={420} loading="lazy" decoding="async" />
            </Link>
            <div className="blog-card-body">
              <div className="blog-meta">{dateOnly(post.published_at)}</div>
              <h2 className="serif">
                <Link to={`/magazin/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.perex}</p>
              <Link className="text-link" to={`/magazin/${post.slug}`}>
                Číst dál →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Detail článku. */
export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setErr(false);
    setPost(null);
    void api<{ post: Post; related: Post[] }>(`/posts/${slug}`)
      .then((r) => {
        setPost(r.post);
        setRelated(r.related || []);
      })
      .catch(() => setErr(true));
  }, [slug]);

  useSeo({
    title: post ? post.meta_title || `${post.title} — KAVKA Magazín` : "Magazín — KAVKA",
    description: post?.meta_description || post?.perex || undefined,
    image: post?.cover || undefined,
    type: "article",
  });

  if (err) {
    return (
      <div className="wrap empty">
        <h1 className="serif">404</h1>
        <p>Tenhle článek jsme nenašli.</p>
        <Link className="btn" to="/magazin">
          Zpět do magazínu
        </Link>
      </div>
    );
  }
  if (!post) return <div className="wrap empty">Načítám článek…</div>;

  return (
    <div className="wrap blog-detail">
      <div className="crumbs">
        <Link to="/">Domů</Link> / <Link to="/magazin">Magazín</Link> / <span>{post.title}</span>
      </div>
      <article className="post">
        <header>
          <div className="blog-meta">
            {dateOnly(post.published_at)}
            {post.author ? ` · ${post.author}` : ""}
          </div>
          <h1 className="serif">{post.title}</h1>
          {post.perex && <p className="post-perex">{post.perex}</p>}
        </header>
        {post.cover && (
          <OptimizedImg className="post-cover" src={post.cover} alt="" width={1200} height={630} decoding="async" />
        )}
        {/* Obsah článku je HTML z editoru v administraci (píše ho správce e-shopu). */}
        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body || "" }} />
        {tagList(post.tags).length > 0 && (
          <div className="blog-tags" style={{ marginTop: 24 }}>
            {tagList(post.tags).map((t) => (
              <Link key={t} className="chip" to={`/magazin?tag=${encodeURIComponent(t)}`}>
                {t}
              </Link>
            ))}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section className="blog-related">
          <h2 className="serif">Další čtení</h2>
          <div className="blog-grid">
            {related.map((r) => (
              <article className="blog-card" key={r.id}>
                <Link to={`/magazin/${r.slug}`} className="blog-card-img" aria-label={r.title}>
                  <OptimizedImg src={r.cover || "/hero.webp"} alt="" width={640} height={420} loading="lazy" decoding="async" />
                </Link>
                <div className="blog-card-body">
                  <div className="blog-meta">{dateOnly(r.published_at)}</div>
                  <h3 className="serif">
                    <Link to={`/magazin/${r.slug}`}>{r.title}</Link>
                  </h3>
                  <p>{r.perex}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
