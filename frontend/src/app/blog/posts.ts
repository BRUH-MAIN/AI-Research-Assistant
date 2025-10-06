export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  readingTime: string;
  gradient: string;
  tags: string[];
  sections: Array<{
    heading: string;
    body: string[];
    highlight?: string;
  }>;
  takeaways: string[];
  recommendedActions: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "rag-design-language",
    title: "Designing a Research Assistant that Feels Bespoke",
    summary:
      "How we crafted a glassmorphic interface that foregrounds research intent while keeping assistant responses trustworthy.",
    publishedAt: "October 19, 2024",
    readingTime: "8 min read",
    gradient: "from-accent via-rose-400 to-rose-600",
    tags: ["design systems", "ai ux", "product"],
    sections: [
      {
        heading: "Intent-first discovery",
        body: [
          "Researchers arrive with concrete hypotheses or vague hunches. We mapped every surface around articulating intent fast—hero cards let you declare the problem space in under ten seconds.",
          "By pairing this with context memory and evocative microcopy, the UI reassures teams that the assistant won’t hallucinate the plan for them—humans stay in the driver’s seat.",
        ],
        highlight:
          "We banned generic gradients. Every background references the spectrum of light microscopes use when isolating samples.",
      },
      {
        heading: "Trust in the glass",
        body: [
          "Glassmorphism gives an instant lab-grade feel but can become gimmicky. We use it sparingly: to distinguish system voice, pinned context, and provenance cues.",
          "Cards that hold citations show a higher refraction and subtle vignette. This cues 'handle with care' without neon danger banners.",
        ],
      },
      {
        heading: "Motion as narrative",
        body: [
          "Micro-animations only trigger when context changes—loading spinners mimic oscillating spectrograms, while chip toggles pivot like microlenses.",
          "This keeps focus on the research narrative, not ornamental flourish. Motion is the voice of the assistant acknowledging new information.",
        ],
      },
    ],
    takeaways: [
      "Design research tools with ritual in mind: pre-session, mid-session, cool-down.",
      "Differentiate assistant vs. human contributions with contrast, not cartoon avatars.",
      "Elegance emerges from restraint—glass effects only on information that needs a halo.",
    ],
    recommendedActions: [
      "Audit your workflows: identify where confidence dips and design explicit guardrails.",
      "Introduce visual rhythms that echo the discipline you serve—biotech, policy, finance each have unique aesthetics.",
    ],
  },
  {
    slug: "rag-playbooks",
    title: "Operational Playbooks for Retrieval-Augmented Research",
    summary:
      "Four repeatable rituals that turn ad-hoc prompting into reliable, defensible outputs for your lab or newsroom.",
    publishedAt: "October 12, 2024",
    readingTime: "6 min read",
    gradient: "from-emerald-400 via-emerald-500 to-sky-500",
    tags: ["rag", "operations", "playbooks"],
    sections: [
      {
        heading: "The 30-minute evidence sprint",
        body: [
          "Kick off by framing an evidence statement, not a question. The assistant retrieves contrasting claims so researchers don’t tunnel into confirmation bias.",
          "A moment of annotation follows: highlight contradictory passages, attach hypotheses, and flag what the assistant should not fabricate.",
        ],
      },
      {
        heading: "Live synthesis briefs",
        body: [
          "We wired real-time transcripts into the chat UI so the assistant can surface unresolved threads. Teams triage them before the meeting ends.",
          "The brief exports with provenance chips that link back to both chats and papers, preventing orphaned claims.",
        ],
        highlight:
          "Retrieval without rituals is trivia. Embed the assistant in your ceremonies and watch recall soar.",
      },
      {
        heading: "Experiment retros",
        body: [
          "Post-experiment, the assistant collates logs, surfaces anomalies, and drafts a retro template. Humans edit tone but keep the factual spine.",
          "This keeps institutional knowledge alive even as teams rotate.",
        ],
      },
    ],
    takeaways: [
      "RAG thrives on explicit guardrails—document the moments where autonomy is safe vs. when human review is mandatory.",
      "Pair each retrieval flow with a canonical export (brief, memo, deck) so insights never live only in chat.",
      "Measure adoption by how many decisions cite assistant-surfaced evidence, not just session counts.",
    ],
    recommendedActions: [
      "Draft a playbook for your highest-stakes workflow and assign an owner to keep it living.",
      "Instrument assistant interactions to capture which citations get reused in final deliverables.",
    ],
  },
  {
    slug: "dataset-curation",
    title: "Curating High-Signal Corpora for Retrieval",
    summary:
      "A field guide to pruning, tagging, and scoring research documents before they ever hit your vector store.",
    publishedAt: "October 5, 2024",
    readingTime: "7 min read",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    tags: ["data", "curation", "workflows"],
    sections: [
      {
        heading: "Score what matters",
        body: [
          "We score documents by decision impact, not raw popularity. Each upload asks: will this change the trajectory of a project?",
          "Low-signal docs get sandboxed; high-signal ones receive richer metadata and human summaries.",
        ],
      },
      {
        heading: "Human-in-the-loop tagging",
        body: [
          "Automatic tagging boots up the system, but reviewers add the context no model sees—like internal project codenames or risk frameworks.",
          "Our UI nudges reviewers with suggested tags yet celebrates manual additions with subtle animations.",
        ],
      },
      {
        heading: "Expiration rituals",
        body: [
          "Knowledge rots. We schedule periodic 'decay audits' where the assistant flags citations older than their relevance window.",
          "Teams decide to refresh, re-contextualise, or retire the source. The UI renders fading glows to signal urgency.",
        ],
        highlight:
          "Healthy corpora behave like gardens—regular pruning keeps retrieval delightful.",
      },
    ],
    takeaways: [
      "Define quality tiers for your documents and visualise them so teams know what to trust blindly.",
      "Let humans teach the assistant nuanced tags; reward the behaviour with instant feedback.",
      "Schedule freshness reviews—AI can't smell stale research, humans can when prompted.",
    ],
    recommendedActions: [
      "Stand up a monthly corpus health check with both quantitative metrics and qualitative review.",
      "Instrument your upload flow to capture attribution so teams know who curated what.",
    ],
  },
];
