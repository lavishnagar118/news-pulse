"""Unit tests for deterministic TopicClusterer."""

import unittest
from datetime import datetime, timezone, timedelta
from database.models import Article
from processing.clusterer import TopicClusterer


class TestTopicClusterer(unittest.TestCase):
    """Test suite for TF-IDF cosine topic clustering."""

    def setUp(self):
        self.clusterer = TopicClusterer(similarity_threshold=0.12)
        self.base_time = datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)

    def test_empty_input_handled(self):
        clusters, groups = self.clusterer.cluster_articles([])
        self.assertEqual(len(clusters), 0)
        self.assertEqual(len(groups), 0)

    def test_single_article_handled(self):
        art = Article(
            title="Space Telescope Captures Distant Galaxy Formation",
            source="Science Daily",
            url="https://example.com/space-1",
            published_at=self.base_time,
            summary="Astronomers observe earliest stellar nurseries.",
        )
        clusters, groups = self.clusterer.cluster_articles([art])
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].article_count, 1)
        self.assertEqual(clusters[0].start_time, self.base_time)
        self.assertEqual(clusters[0].end_time, self.base_time)
        self.assertTrue(len(clusters[0].label) > 0)

    def test_clearly_related_articles_cluster_together(self):
        # Two articles covering the exact same AI safety bill
        t1 = self.base_time
        t2 = self.base_time + timedelta(hours=2)

        art1 = Article(
            title="Senate Committee Passes Landmark Artificial Intelligence Safety Legislation",
            source="News Outlet A",
            url="https://example.com/ai-senate",
            published_at=t1,
            summary="Lawmakers approved new requirements for frontier artificial intelligence models and safety testing.",
        )
        art2 = Article(
            title="Lawmakers Vote to Advance Artificial Intelligence Safety Regulations",
            source="News Outlet B",
            url="https://example.com/ai-lawmakers",
            published_at=t2,
            summary="The Senate passed groundbreaking rules governing safety evaluations for frontier artificial intelligence.",
        )

        clusters, groups = self.clusterer.cluster_articles([art1, art2])
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].article_count, 2)
        self.assertIn("Artificial Intelligence", clusters[0].label)

    def test_clearly_unrelated_articles_remain_separate(self):
        art1 = Article(
            title="Senate Committee Passes Landmark Artificial Intelligence Safety Legislation",
            source="News Outlet A",
            url="https://example.com/ai-senate",
            published_at=self.base_time,
            summary="Lawmakers approved new requirements for frontier artificial intelligence models.",
        )
        art2 = Article(
            title="Premier League: Arsenal Defeats Chelsea in Derby Showdown",
            source="Sports News",
            url="https://example.com/arsenal-chelsea",
            published_at=self.base_time + timedelta(hours=1),
            summary="A late header in stoppage time secured all three points for Arsenal at Emirates Stadium.",
        )

        clusters, groups = self.clusterer.cluster_articles([art1, art2])
        # Two unrelated articles should form 2 singleton clusters
        self.assertEqual(len(clusters), 2)
        self.assertEqual(clusters[0].article_count, 1)
        self.assertEqual(clusters[1].article_count, 1)

    def test_cluster_start_end_timestamps(self):
        t1 = datetime(2026, 9, 21, 6, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 21, 14, 30, 0, tzinfo=timezone.utc)
        t3 = datetime(2026, 9, 21, 18, 45, 0, tzinfo=timezone.utc)

        art1 = Article(
            title="Volcanic Eruption Shuts Down Flights in Iceland",
            source="BBC",
            url="https://example.com/iceland-1",
            published_at=t1,
            summary="Lava fountains erupted on the Reykjanes peninsula, halting air travel.",
        )
        art2 = Article(
            title="Iceland Volcano Erupts Again, Cancelling Regional Flights",
            source="Reuters",
            url="https://example.com/iceland-2",
            published_at=t2,
            summary="A volcanic fissure spewed lava on the Reykjanes peninsula, forcing flight cancellations.",
        )
        art3 = Article(
            title="Ash Cloud from Iceland Volcano Disrupts European Air Travel",
            source="Al Jazeera",
            url="https://example.com/iceland-3",
            published_at=t3,
            summary="Flight operations remain grounded across Iceland following a major volcanic eruption.",
        )

        clusters, groups = self.clusterer.cluster_articles([art1, art2, art3])
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].article_count, 3)
        self.assertEqual(clusters[0].start_time, t1)
        self.assertEqual(clusters[0].end_time, t3)

    def test_deterministic_repeated_runs_produce_same_grouping(self):
        articles = [
            Article(
                title="Federal Reserve Signals Interest Rate Pause",
                source="Financial Times",
                url="https://example.com/fed-1",
                published_at=self.base_time,
                summary="Central bank officials indicated borrowing rates will remain unchanged this quarter.",
            ),
            Article(
                title="Central Bank Keeps Interest Rates Steady Amid Inflation Slowdown",
                source="Wall Street Journal",
                url="https://example.com/fed-2",
                published_at=self.base_time + timedelta(hours=1),
                summary="The Federal Reserve voted to hold benchmark interest rates steady.",
            ),
            Article(
                title="NASA Rover Discovers Ancient Riverbed on Mars",
                source="Science News",
                url="https://example.com/mars-rover",
                published_at=self.base_time + timedelta(hours=2),
                summary="Sedimentary rock layers suggest water flowed continuously on the Red Planet billions of years ago.",
            ),
        ]

        # Run 1
        clusters_run1, groups_run1 = self.clusterer.cluster_articles(articles)
        # Run 2
        clusters_run2, groups_run2 = self.clusterer.cluster_articles(articles)

        self.assertEqual(len(clusters_run1), len(clusters_run2))
        self.assertEqual(
            [c.label for c in clusters_run1],
            [c.label for c in clusters_run2],
        )
        self.assertEqual(
            [c.article_count for c in clusters_run1],
            [c.article_count for c in clusters_run2],
        )

    def test_clustering_data_consistency_invariants(self):
        """Verify strict invariant relationships between clusters and their member articles."""
        articles = [
            Article(
                id="art-1",
                title="Global Climate Summit Agrees on New Clean Energy Target",
                source="Reuters",
                url="https://example.com/climate-summit-1",
                published_at=self.base_time,
                summary="Delegates agreed to triple renewable energy capacity by 2035.",
            ),
            Article(
                id="art-2",
                title="Renewable Energy Capacity Set to Triple Following Global Climate Summit",
                source="AP News",
                url="https://example.com/climate-summit-2",
                published_at=self.base_time + timedelta(hours=3),
                summary="World leaders reached agreement on ambitious renewable energy and climate goals.",
            ),
            Article(
                id="art-3",
                title="Electric Vehicle Sales Surge Worldwide in Fourth Quarter",
                source="Bloomberg",
                url="https://example.com/ev-sales",
                published_at=self.base_time + timedelta(hours=1),
                summary="Automakers reported record quarterly deliveries for battery electric vehicles.",
            ),
        ]

        clusters, groups = self.clusterer.cluster_articles(articles)
        self.assertGreater(len(clusters), 0)

        total_members = 0
        for idx, cluster in enumerate(clusters):
            members = groups.get(idx, [])
            # Invariant 1: article_count must equal exact number of members
            self.assertEqual(cluster.article_count, len(members))
            self.assertGreater(len(members), 0)

            # Invariant 2: start_time must equal minimum published_at
            expected_start = min(a.published_at for a in members)
            self.assertEqual(cluster.start_time, expected_start)

            # Invariant 3: end_time must equal maximum published_at
            expected_end = max(a.published_at for a in members)
            self.assertEqual(cluster.end_time, expected_end)

            total_members += len(members)

        # Invariant 4: Partition property - total cluster members equals total input articles
        self.assertEqual(total_members, len(articles))


if __name__ == "__main__":
    unittest.main()
