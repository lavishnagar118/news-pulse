"""Deterministic news article category classifier.

Classifies news articles into standard editorial categories based on keyword presence
and contextual heuristics extracted from the article headline and summary.
Zero external AI or network calls required; 100% explainable and deterministic.
"""

import re
from typing import Dict, List, Optional


class ArticleCategorizer:
    """Categorizes news articles based on editorial domain vocabularies."""

    # Categorization keyword regex patterns
    CATEGORIES: Dict[str, List[str]] = {
        "Technology": [
            r"\bai\b",
            r"artificial intelligence",
            r"machine learning",
            r"technology",
            r"software",
            r"hardware",
            r"cybersecurity",
            r"cyber",
            r"data center",
            r"robotics?",
            r"chips?",
            r"semiconductor",
            r"google",
            r"apple",
            r"microsoft",
            r"nvidia",
            r"meta\b",
            r"algorithm",
            r"computing",
            r"crypto",
            r"bitcoin",
            r"blockchain",
            r"smartphone",
        ],
        "Politics": [
            r"elections?",
            r"voters?",
            r"parliament",
            r"congress",
            r"senate",
            r"lawmakers?",
            r"chancellor",
            r"prime minister",
            r"president\b",
            r"presidential",
            r"minister",
            r"democrats?",
            r"republicans?",
            r"campaign",
            r"governor",
            r"legislation",
            r"extradition",
            r"protests?",
            r"imran khan",
            r"trump\b",
            r"biden\b",
            r"merz\b",
            r"cdu\b",
            r"white house",
            r"supreme court",
            r"indicted",
            r"verdict",
            r"referendum",
        ],
        "Business": [
            r"markets?",
            r"econom(y|ic)",
            r"inflation",
            r"stocks?",
            r"trade\b",
            r"tariffs?",
            r"banks?",
            r"investors?",
            r"revenue",
            r"profits?",
            r"corporat(e|ion)",
            r"ceo\b",
            r"dollars?",
            r"euros?",
            r"shares?",
            r"housing market",
            r"financial",
            r"real estate",
            r"interest rates?",
        ],
        "Science": [
            r"nasa\b",
            r"space\b",
            r"astronomy",
            r"planets?",
            r"telescopes?",
            r"climate change",
            r"fossils?",
            r"biolog(y|ical)",
            r"physics",
            r"earthquakes?",
            r"wildlife",
            r"species",
            r"environment",
            r"antarctica",
            r"moon\b",
            r"mars\b",
            r"archaeolog(y|ist)",
        ],
        "Health": [
            r"health",
            r"hospitals?",
            r"diseases?",
            r"viruses?",
            r"vaccines?",
            r"medical",
            r"doctors?",
            r"patients?",
            r"cancer",
            r"fda\b",
            r"who\b",
            r"mental health",
            r"drugs?",
            r"medicines?",
            r"outbreak",
            r"epidemics?",
            r"surgery",
        ],
        "Sports": [
            r"football",
            r"soccer",
            r"champions league",
            r"premier league",
            r"nba\b",
            r"nfl\b",
            r"tennis",
            r"cricket",
            r"golf",
            r"olympics",
            r"match\b",
            r"referees?",
            r"mourinho",
            r"stadium",
            r"world cup",
            r"athletics",
            r"coaches?",
            r"championship",
        ],
        "Entertainment": [
            r"films?",
            r"movies?",
            r"cinemas?",
            r"actors?",
            r"actress(es)?",
            r"hollywood",
            r"music\b",
            r"albums?",
            r"singers?",
            r"concerts?",
            r"celebrity",
            r"theatre",
            r"kennedy center",
            r"grammys?",
            r"oscars?",
            r"television",
            r"crawford",
            r"gerber\b",
        ],
        "World": [
            r"ukraine",
            r"russia\b",
            r"russian",
            r"gaza",
            r"israel",
            r"palestin(e|ian)",
            r"syria",
            r"lebanon",
            r"iran\b",
            r"china\b",
            r"chinese",
            r"ethiopia",
            r"sudan",
            r"haiti\b",
            r"united nations",
            r"\bun\b",
            r"nato\b",
            r"diplomac(y|tic)",
            r"foreign affairs",
            r"global\b",
            r"war\b",
            r"rebels?",
            r"military",
            r"troops?",
            r"conflicts?",
            r"borders?",
            r"ceasefire",
        ],
    }

    @classmethod
    def classify(cls, title: str, summary: Optional[str] = "") -> str:
        """Deterministically determine the editorial category of an article.
        
        Headline matches are prioritized with double weight over summary text.
        Returns 'General' if no domain-specific category reaches threshold.
        """
        clean_title = (title or "").lower()
        clean_summary = (summary or "").lower()
        full_text = f"{clean_title} {clean_summary}"

        scores: Dict[str, int] = {}

        for category, patterns in cls.CATEGORIES.items():
            score = 0
            for pattern in patterns:
                # Check for regex match
                if re.search(pattern, full_text):
                    # Double weight if pattern appears directly in the headline
                    if re.search(pattern, clean_title):
                        score += 2
                    else:
                        score += 1
            if score > 0:
                scores[category] = score

        if not scores:
            return "General"

        # Return category with highest score
        return max(scores, key=lambda c: scores[c])
