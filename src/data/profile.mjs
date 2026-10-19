export const profile = {
  name: 'Omkar Joshi',
  location: 'Dublin, Ireland',
  email: 'omkarkjoshi09@gmail.com',
  github: 'https://github.com/omkarjoshi0304',
  linkedin: 'https://www.linkedin.com/in/omkarkjoshi/',
  description: 'Software engineer at Red Hat, building secure AI systems and cloud infrastructure. Based in Dublin. A place for my work, side projects, and notes along the way.',
  skills: [
    { name: 'Languages', items: 'Python, Go, C++, Java, TypeScript, SQL' },
    { name: 'AI & retrieval', items: 'Llama Stack, RAG, MCP, LangGraph, Pydantic AI, Google ADK, vector databases' },
    { name: 'Cloud & infrastructure', items: 'Kubernetes, OpenShift, AWS, Terraform, Ansible, Linux, Docker, Podman' },
    { name: 'Backend & observability', items: 'FastAPI, Django, PostgreSQL, MySQL, MongoDB, CI/CD, ELK, Prometheus, Grafana' },
  ],
  experience: [
    {
      role: 'Associate Software Engineer', company: 'Red Hat', period: 'Dec 2025 — Present', current: true,
      description: 'Building secure, grounded AI for OpenStack Lightspeed. Working across RAG pipelines, model guardrails, evaluation, and the Kubernetes Operator that brings the stack together.',
      details: [
        'Build contextual retrieval pipelines with FAISS and Solr-based Offline Knowledge Portals, connecting enterprise documentation to grounded AI responses.',
        'Develop MCP components and provider-level validation, including question validators, summarizers, and redactors.',
        'Contribute to automated RAG evaluation with LLM-as-judge scoring for faithfulness, retrieval quality, and answer correctness.',
        'Contribute upstream fixes to Llama Stack and declarative infrastructure deployment through the Lightspeed Operator.',
      ],
      tags: ['Python', 'Llama Stack', 'RAG', 'Kubernetes'],
    },
    {
      role: 'Software Engineering Intern', company: 'Red Hat', period: 'Jun — Aug 2025',
      description: 'Worked on Lightspeed’s retrieval pipelines and structured JSON responses, making AI outputs easier to use in downstream automation.',
      details: [
        'Developed structured JSON output supporting FAISS and Llama Stack vector stores.',
        'Improved ingestion and retrieval workflows through pipeline updates, bug fixes, and agentic query handling.',
      ],
      tags: ['Python', 'RAG', 'MCP'],
    },
    {
      role: 'Teaching Assistant', company: 'Dublin City University', period: 'Sep 2024 — Apr 2025',
      description: 'Helped students connect theory to practice in engineering mathematics, mobile robotics, and data communication through labs and one-to-one guidance.',
      details: [], tags: [],
    },
    {
      role: 'Data Science Intern', company: 'VCET', period: 'Jun — Jul 2022',
      description: 'Evaluated, trained, and fine-tuned machine learning models across a range of datasets using Python.',
      details: [], tags: [],
    },
  ],
  education: [
    { degree: 'Master’s in Electronics & Computer Engineering', school: 'Dublin City University', period: '2024 — 2025', location: 'Dublin, Ireland' },
    { degree: 'B.E. in Electronics & Telecommunication Engineering', school: 'University of Mumbai', period: '2020 — 2024', location: 'Mumbai, India' },
  ],
  community: [
    { role: 'Student Ambassador', organization: 'Dublin City University', period: '2024 — 2025', description: 'Represented DCU at outreach events and helped connect with prospective students.' },
    { role: 'President, Students’ Council', organization: 'VCET', period: '2023 — 2024', description: 'Led a team of over 150 students and coordinated resources for university events.' },
    { role: 'Student Representative', organization: 'College Development Committee, VCET', period: '2021 — 2022', description: 'Contributed to college development planning across academics, placements, and infrastructure.' },
  ],
  achievements: [
    'Winner · VCET national-level project competition',
    'Runner-up · TSEC National Level Hackathon',
    'Runner-up · IETE–DMCE national-level project competition',
    'First prize · IETE–VCET national-level technical paper presentation',
  ],
  certifications: ['AWS Cloud Practitioner', 'Red Hat OpenShift (DO188)'],
};

// Original engineering illustrations; order follows the page's scroll progress.
export const artworks = [
  {
    title: 'AI applications',
    src: '/images/ai-applications.svg',
    width: 960, height: 1120,
    alt: 'AI application architecture: a question flows through contextual retrieval, a vector store, and source documents to produce a grounded response.',
  },
  {
    title: 'Agent workflows',
    src: '/images/agent-workflows.svg',
    width: 960, height: 1120,
    alt: 'An agent orchestrator connects a user request to tools, retrieval, human approval, and a validated response.',
  },
  {
    title: 'Platform engineering',
    src: '/images/platform-engineering.svg',
    width: 960, height: 1120,
    alt: 'A Kubernetes control plane manages three worker nodes with application, retrieval, and observability workloads.',
  },
  {
    title: 'Delivery and observability',
    src: '/images/delivery-observability.svg',
    width: 960, height: 1120,
    alt: 'A continuous delivery pipeline connects commit, build, test, and deployment stages to metrics, logs, traces, and a feedback loop.',
  },
];
