"""Deterministic topic clustering engine using TF-IDF and cosine similarity."""

import html
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import requests
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from config import Config
    from database.models import Article, Cluster, utc_now
except ImportError:
    from ..config import Config
    from ..database.models import Article, Cluster, utc_now

logger = logging.getLogger("news-pulse.scraper.clusterer")

# Curated English stop words and common broadcast/news conversational fillers
STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
    "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
    "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "our",
    "ours", "ourselves", "out", "over", "own", "s", "same", "she", "should", "so", "some", "such", "t",
    "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
    "when", "where", "which", "while", "who", "whom", "why", "will", "with", "you", "your", "yours",
    "yourself", "yourselves",
    # Conversational & journalist broadcast artifacts
    "says", "said", "say", "new", "amid", "watch", "photos", "video", "told", "day", "days", "week",
    "ahead", "comes", "emerges", "emerge", "make", "makes", "taking", "takes", "took", "know", "knows",
    "bbc", "npr", "al", "jazeera", "reuters", "times", "post", "news", "exclusive", "live", "updates",
    "years", "year", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "one",
    "first", "second", "third", "early", "right", "left", "way", "mr", "ms", "dr", "also", "including"
}


class TopicClusterer:
    """Groups news articles into topic clusters using TF-IDF and cosine distance agglomeration.

    Architecture & Rationale:
    1. Feature Space: We compute TF-IDF vectors exclusively from (title + summary). Full article
       bodies can introduce disparate sub-topics and noise; titles and summaries encapsulate the
       core editorial subject.
    2. Similarity: Cosine similarity measures angular alignment regardless of text length.
    3. Clustering Strategy: We use Agglomerative Hierarchical Clustering with average linkage.
       Unlike single-linkage (which suffers from the transitive "chaining problem" where A-B-C merges
       unrelated stories), average linkage guarantees that the mean pairwise distance between all
       articles in merged groups stays within the distance threshold (1 - similarity_threshold).
    4. Determinism: Zero random seeds, fully reproducible clustering.
    5. Fallback Labeling: Labels are extracted directly from salient TF-IDF terms without requiring AI.
    """

    def __init__(
        self,
        similarity_threshold: Optional[float] = None,
        max_df: Optional[float] = None,
        min_df: Optional[int] = None,
        ngram_max: Optional[int] = None,
    ):
        self.similarity_threshold = (
            similarity_threshold
            if similarity_threshold is not None
            else Config.SIMILARITY_THRESHOLD
        )
        self.max_df = max_df if max_df is not None else Config.TFIDF_MAX_DF
        self.min_df = min_df if min_df is not None else Config.TFIDF_MIN_DF
        self.ngram_max = ngram_max if ngram_max is not None else Config.TFIDF_NGRAM_MAX

    @staticmethod
    def preprocess(text: Optional[str]) -> str:
        """Sanitize text: lowercase, remove HTML tags/entities, remove punctuation, collapse whitespace."""
        if not text:
            return ""
        unescaped = html.unescape(text)
        no_html = re.sub(r"<[^>]+>", " ", unescaped)
        lowered = no_html.lower()
        no_punct = re.sub(r"[^\w\s]", " ", lowered)
        normalized = re.sub(r"\s+", " ", no_punct).strip()
        return normalized

    def build_corpus(self, articles: List[Article]) -> List[str]:
        """Construct clustering documents: title receives doubled weighting relative to summary."""
        corpus = []
        for a in articles:
            clean_title = self.preprocess(a.title)
            clean_summary = self.preprocess(a.summary)
            # Give title prominence in lexical matching
            combined = f"{clean_title} {clean_title} {clean_summary}".strip()
            corpus.append(combined if combined else "news article")
        return corpus

    def generate_cluster_label(
        self,
        cluster_articles: List[Article],
        X_cluster,
        feature_names: List[str],
    ) -> str:
        """Generate a concise, deterministic 2-4 word Title Cased label.

        Uses cluster mean TF-IDF scores boosted by term frequency across member titles.
        """
        if not cluster_articles:
            return "General News"

        # Singleton cluster: extract salient words directly from the single article title
        if len(cluster_articles) == 1:
            title = cluster_articles[0].title
            words = [
                w for w in re.sub(r"[^\w\s]", "", title).split()
                if w.lower() not in STOP_WORDS and len(w) > 2 and not w.isdigit()
            ]
            if words:
                return " ".join(words[:3]).title()
            return title[:40].title()

        # Multi-article cluster: compute mean TF-IDF vector across cluster members
        title_word_sets = [
            set(self.preprocess(a.title).split()) for a in cluster_articles
        ]
        mean_vec = X_cluster.mean(axis=0).A1
        ranked_indices = mean_vec.argsort()[::-1]

        candidates = []
        for idx in ranked_indices[:40]:
            term = feature_names[idx]
            tokens = term.split()
            # Filter out stop words, digits, and short fragments
            if any(t in STOP_WORDS or len(t) < 3 or t.isdigit() for t in tokens):
                continue

            # Boost terms present across multiple article titles
            title_coverage = sum(1 for tw in title_word_sets if any(t in tw for t in tokens))
            score = mean_vec[idx] * (1.5 if title_coverage > 1 else 1.0)
            candidates.append((score, term))

        candidates.sort(key=lambda x: x[0], reverse=True)

        selected_terms: List[str] = []
        for _, term in candidates:
            # Prevent redundant sub-strings (e.g. 'election' and 'state election')
            if any(term in s or s in term for s in selected_terms):
                continue
            selected_terms.append(term)
            if len(selected_terms) >= 3:
                break

        if selected_terms:
            deterministic_label = " ".join([t.title() for t in selected_terms])
        else:
            deterministic_label = cluster_articles[0].title[:35].title()

        # Optional Ollama refinement (only if AI_PROVIDER=ollama and reachable)
        if Config.is_ai_enabled():
            return self.refine_label_with_ollama(deterministic_label, cluster_articles)

        return deterministic_label

    def refine_label_with_ollama(self, deterministic_label: str, articles: List[Article]) -> str:
        """Optional hook: queries local Ollama to refine cluster label into a journalistic headline.
        Falls back safely to deterministic_label on timeout or failure.
        """
        headlines = [a.title for a in articles[:3]]
        prompt = (
            f"Generate a concise 2 to 4 word news topic label for these related headlines:\n"
            f"- " + "\n- ".join(headlines) + "\n"
            f"Respond with ONLY the 2-4 word topic label, nothing else."
        )

        try:
            url = f"{Config.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
            payload = {
                "model": Config.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 12},
            }
            res = requests.post(url, json=payload, timeout=3)
            if res.status_code == 200:
                refined = res.json().get("response", "").strip().strip('"').strip("'")
                words = refined.split()
                if 1 <= len(words) <= 5:
                    logger.debug("Ollama refined label: '%s' -> '%s'", deterministic_label, refined)
                    return refined.title()
        except Exception as err:
            logger.debug("Ollama label refinement skipped/failed (%s); using deterministic label.", err)

        return deterministic_label

    def cluster_articles(
        self,
        articles: List[Article],
    ) -> Tuple[List[Cluster], Dict[int, List[Article]]]:
        """Group given articles into topic clusters using TF-IDF and cosine distance.

        Returns:
            Tuple of:
            - List of Cluster domain models (with startTime, endTime, articleCount, label)
            - Mapping of cluster_index -> list of member Article objects
        """
        if not articles:
            return [], {}

        if len(articles) == 1:
            article = articles[0]
            label = self.generate_cluster_label([article], None, [])
            cluster = Cluster(
                label=label,
                start_time=article.published_at,
                end_time=article.published_at,
                article_count=1,
                created_at=utc_now(),
            )
            return [cluster], {0: [article]}

        corpus = self.build_corpus(articles)

        # 1. Compute TF-IDF representation
        vectorizer = TfidfVectorizer(
            stop_words=list(STOP_WORDS),
            ngram_range=(1, self.ngram_max),
            max_df=self.max_df if len(articles) > 5 else 1.0,
            min_df=self.min_df,
        )
        X = vectorizer.fit_transform(corpus)
        feature_names = vectorizer.get_feature_names_out()

        # 2. Agglomerative Clustering with average linkage and cosine distance
        distance_threshold = max(0.001, 1.0 - self.similarity_threshold)
        clustering_model = AgglomerativeClustering(
            metric="cosine",
            linkage="average",
            distance_threshold=distance_threshold,
            n_clusters=None,
        )

        labels = clustering_model.fit_predict(X.toarray())

        # 3. Group articles by assigned cluster index
        cluster_groups: Dict[int, List[Article]] = {}
        cluster_indices: Dict[int, List[int]] = {}
        for idx, cluster_idx in enumerate(labels):
            cluster_groups.setdefault(cluster_idx, []).append(articles[idx])
            cluster_indices.setdefault(cluster_idx, []).append(idx)

        # 4. Generate Cluster models with timeline data and deterministic labels
        clusters: List[Cluster] = []
        ordered_groups: Dict[int, List[Article]] = {}

        for out_idx, (orig_cluster_id, members) in enumerate(cluster_groups.items()):
            # Timeline boundaries
            start_time = min(m.published_at for m in members)
            end_time = max(m.published_at for m in members)
            member_row_indices = cluster_indices[orig_cluster_id]

            # Label generation
            label = self.generate_cluster_label(
                members,
                X[member_row_indices],
                feature_names,
            )

            from bson import ObjectId
            cluster_id = str(ObjectId())
            cluster = Cluster(
                id=cluster_id,
                label=label,
                start_time=start_time,
                end_time=end_time,
                article_count=len(members),
                created_at=utc_now(),
            )
            clusters.append(cluster)
            ordered_groups[out_idx] = members

        return clusters, ordered_groups

    def cluster_and_persist(
        self,
        articles: List[Article],
        db_manager,
    ) -> Tuple[List[Cluster], Dict[str, Any]]:
        """Cluster all given articles and persist to MongoDB, updating article.clusterId.

        Returns:
            Tuple of (clusters_list, diagnostics_dict)
        """
        logger.info("Starting topic clustering for %d articles...", len(articles))
        logger.info(
            "Configuration: similarity_threshold=%.2f, max_df=%.2f, min_df=%d, ngram_max=%d",
            self.similarity_threshold,
            self.max_df,
            self.min_df,
            self.ngram_max,
        )

        clusters, groups = self.cluster_articles(articles)

        # Build mapping of article.id -> cluster._id
        article_cluster_map: Dict[str, str] = {}
        for cluster_idx, members in groups.items():
            cluster_id = clusters[cluster_idx].id
            for article in members:
                if article.id and cluster_id:
                    article_cluster_map[article.id] = cluster_id

        # Persist clusters and update article cluster references in one pass
        db_manager.replace_clusters(clusters, article_cluster_map)

        # Collect diagnostics
        multi_clusters = [c for c in clusters if c.article_count > 1]
        singletons = [c for c in clusters if c.article_count == 1]
        max_size = max((c.article_count for c in clusters), default=0)

        diagnostics = {
            "total_articles": len(articles),
            "total_clusters": len(clusters),
            "multi_article_clusters": len(multi_clusters),
            "singleton_clusters": len(singletons),
            "max_cluster_size": max_size,
            "similarity_threshold": self.similarity_threshold,
            "clusters": clusters,
            "groups": groups,
        }

        logger.info(
            "Topic clustering complete: %d clusters generated (%d multi-article, %d singletons).",
            len(clusters),
            len(multi_clusters),
            len(singletons),
        )

        return clusters, diagnostics
