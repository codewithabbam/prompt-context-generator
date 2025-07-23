import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

type Field = { name: string; label: string };
type CategoryConfig = {
  id: string;
  label: string;
  fields: Field[];
  generateContext: (data: Record<string, string>) => string;
  generatePrompts: (data: Record<string, string>) => string;
};
type Template = {
  name: string;
  categoryId: string;
  data: Record<string, string>;
};
type HistoryEntry = {
  id: string;
  timestamp: number;
  categoryId: string;
  templateName: string | null;
  context: string;
  prompts: string;
  formData: Record<string, string>;
};

const LOCAL_STORAGE_TEMPLATES = 'promptTemplates';
const LOCAL_STORAGE_HISTORY = 'promptHistory';

// const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const categories: CategoryConfig[] = [
  {
    id: 'app',
    label: 'App Development',
    fields: [
      { name: 'appType', label: 'App Type' },
      { name: 'targetAudience', label: 'Target Audience' },
      { name: 'mainGoals', label: 'Main Goals (comma separated)' },
      { name: 'frontendTech', label: 'Frontend Tech Stack' },
      { name: 'backendTech', label: 'Backend Tech Stack' },
      { name: 'databaseTech', label: 'Database Technology' },
      { name: 'keyFeatures', label: 'Key Features (comma separated)' },
      {
        name: 'nonFunctionalRequirements',
        label: 'Non-Functional Requirements',
      },
      { name: 'featureName', label: 'Feature Name' },
      { name: 'deploymentPlatform', label: 'Deployment Platform' },
    ],
    generateContext: (data) =>
      `
You are working on a ${data.appType || '<App Type>'} application targeted at ${
        data.targetAudience || '<Target Audience>'
      }.
The app’s main goals are ${data.mainGoals || '<Main Goals>'}.
The tech stack includes ${data.frontendTech || '<Frontend Tech>'}, ${
        data.backendTech || '<Backend Tech>'
      }, and ${data.databaseTech || '<Database Tech>'}.
The app must support ${data.keyFeatures || '<Key Features>'} and prioritize ${
        data.nonFunctionalRequirements || '<Non-Functional Requirements>'
      }.
`.trim(),
    generatePrompts: (data) =>
      `
Based on the above context, design and implement a ${
        data.featureName || '<Feature Name>'
      } feature including UI, state management, and API interactions.

Design RESTful API endpoints for the ${
        data.featureName || '<Feature Name>'
      } feature with validation and error handling.

Write tests (unit/integration) for the feature, specifying tools and test cases.

Provide deployment instructions for the ${
        data.appType || '<App Type>'
      } app on ${data.deploymentPlatform || '<Deployment Platform>'}.
`.trim(),
  },
  {
    id: 'business',
    label: 'Business Building',
    fields: [
      { name: 'industry', label: 'Industry' },
      { name: 'targetMarket', label: 'Target Market' },
      { name: 'businessGoals', label: 'Business Goals (comma separated)' },
      { name: 'competitors', label: 'Main Competitors (comma separated)' },
      { name: 'competitorSummary', label: 'Competitor Summary' },
      { name: 'budget', label: 'Available Budget' },
    ],
    generateContext: (data) =>
      `
Your company operates in the ${
        data.industry || '<Industry>'
      } industry targeting ${data.targetMarket || '<Target Market>'}.
Current business goals include ${data.businessGoals || '<Business Goals>'}.
Main competitors are ${data.competitors || '<Competitors>'}, summarized as ${
        data.competitorSummary || '<Competitor Summary>'
      }.
Available budget is ${data.budget || '<Budget>'}.
`.trim(),
    generatePrompts: (data) =>
      `
Develop a marketing strategy aligned with ${
        data.businessGoals || '<Business Goals>'
      }.

Outline a product development roadmap including features, timelines, and resources.

Create a financial plan with revenue projections and cost analysis.

Advise on growth and scaling strategies considering market expansion and partnerships.
`.trim(),
  },
];

const emptyData = Object.fromEntries(
  categories.flatMap((cat) => cat.fields.map((f) => [f.name, '']))
);

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [categoryId, setCategoryId] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>(emptyData);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem(LOCAL_STORAGE_TEMPLATES);
    if (t) setTemplates(JSON.parse(t));
    const h = localStorage.getItem(LOCAL_STORAGE_HISTORY);
    if (h) setHistory(JSON.parse(h));
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    setSelectedTemplate('');
    setSelectedHistoryId(null);
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat) {
        setFormData((prev) => {
          const resetData = { ...prev };
          cat.fields.forEach((f) => (resetData[f.name] = ''));
          return resetData;
        });
      }
    }
  }, [categoryId]);

  const currentCategory = categories.find((c) => c.id === categoryId);

  const generateContext = currentCategory
    ? currentCategory.generateContext(formData)
    : '';
  const generatePrompts = currentCategory
    ? currentCategory.generatePrompts(formData)
    : '';

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSelectedHistoryId(null);
    setSelectedTemplate('');
    setAiResult('');
    setAiError(null);
  };

  const saveTemplate = () => {
    if (!categoryId) return alert('Please select a category first!');
    const name = prompt('Enter template name:');
    if (!name) return alert('Template name is required!');
    if (templates.find((t) => t.name === name && t.categoryId === categoryId))
      return alert('Template name must be unique for this category!');
    setTemplates([...templates, { name, categoryId, data: formData }]);
    setSelectedTemplate(name);
    alert(`Template "${name}" saved for category "${categoryId}"`);
  };

  const loadTemplate = (name: string) => {
    const template = templates.find(
      (t) => t.name === name && t.categoryId === categoryId
    );
    if (template) {
      setFormData(template.data);
      setSelectedTemplate(name);
      setSelectedHistoryId(null);
      setAiResult('');
      setAiError(null);
    }
  };

  const deleteTemplate = (name: string) => {
    if (!categoryId) return;
    if (window.confirm(`Delete template "${name}"?`)) {
      setTemplates(
        templates.filter(
          (t) => !(t.name === name && t.categoryId === categoryId)
        )
      );
      if (selectedTemplate === name) {
        setSelectedTemplate('');
        const cat = categories.find((c) => c.id === categoryId);
        if (cat) {
          setFormData((prev) => {
            const resetData = { ...prev };
            cat.fields.forEach((f) => (resetData[f.name] = ''));
            return resetData;
          });
        }
      }
      setAiResult('');
      setAiError(null);
    }
  };

  const addHistoryEntry = () => {
    if (!categoryId) return alert('Select a category first!');
    setHistory([
      {
        id: generateId(),
        timestamp: Date.now(),
        categoryId,
        templateName: selectedTemplate || null,
        context: generateContext,
        prompts: generatePrompts,
        formData: { ...formData },
      },
      ...history,
    ]);
    alert('Saved current prompt & context to history.');
  };

  const loadHistoryEntry = (id: string) => {
    const entry = history.find((h) => h.id === id);
    if (entry) {
      setCategoryId(entry.categoryId);
      setFormData(entry.formData);
      setSelectedHistoryId(id);
      setSelectedTemplate(entry.templateName || '');
      setAiResult('');
      setAiError(null);
    }
  };

  const deleteHistoryEntry = (id: string) => {
    if (window.confirm('Delete this history entry?')) {
      setHistory(history.filter((h) => h.id !== id));
      if (selectedHistoryId === id) setSelectedHistoryId(null);
      setAiResult('');
      setAiError(null);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear all history?')) {
      setHistory([]);
      setSelectedHistoryId(null);
      setAiResult('');
      setAiError(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateContext + '\n' + generatePrompts);
    alert('Copied to clipboard!');
  };

  const downloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([generateContext + '\n' + generatePrompts], {
      type: 'text/plain',
    });
    element.href = URL.createObjectURL(file);
    element.download = `${categoryId || 'output'}-prompt-context.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Generated Context', 10, 20);
    doc.setFontSize(11);
    doc.text(generateContext.trim(), 10, 30, { maxWidth: 190 });
    doc.setFontSize(14);
    doc.text('Generated Prompts', 10, 70);
    doc.setFontSize(11);
    doc.text(generatePrompts.trim(), 10, 80, { maxWidth: 190 });
    doc.save(`${categoryId || 'output'}-prompt-context.pdf`);
  };

  const formatDate = (ms: number) => new Date(ms).toLocaleString();

  // AI completion fetch
  // async function fetchAICompletion() {
  //   if (!DEEPSEEK_API_KEY) {
  //     setAiError('DEEPSEEK API key missing! Add it in your environment.');
  //     return;
  //   }
  //   setAiLoading(true);
  //   setAiError(null);
  //   setAiResult('');
  //   try {
  //     const messages = [
  //       {
  //         role: 'system',
  //         content:
  //           'You are a helpful assistant specialized in prompt engineering and software development.',
  //       },
  //       { role: 'user', content: generateContext + '\n\n' + generatePrompts },
  //     ];
  //     const res = await fetch('http://localhost:3000/api/deepseek', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         model: 'deepseek-chat',
  //         messages,
  //         temperature: 0.7,
  //         max_tokens: 700,
  //       }),
  //     });

  //     if (!res.ok) {
  //       const err = await res.json();
  //       throw new Error(err.error?.message || 'DEEPSEEK API error');
  //     }
  //     const data = await res.json();
  //     setAiResult(data.choices[0].message?.content || '');
  //   } catch (e: any) {
  //     setAiError(e.message || 'Unknown error');
  //   } finally {
  //     setAiLoading(false);
  //   }
  // }

  async function fetchAICompletion() {
    setAiLoading(true);
    setAiError(null);
    setAiResult('');

    try {
      const messages = [
        {
          role: 'system',
          content:
            'You are a helpful assistant specialized in prompt engineering and software development.',
        },
        {
          role: 'user',
          content: generateContext + '\n\n' + generatePrompts,
        },
      ];

      const res = await fetch(`${BACKEND_URL}/api/deepseek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 1.0,
          max_tokens: 700,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        // Handle backend errors
        const errorMsg =
          responseData.error?.message ||
          responseData.message ||
          `API Error: ${res.status}`;
        throw new Error(errorMsg);
      }

      setAiResult(responseData.choices[0].message?.content || '');
    } catch (e: any) {
      setAiError(e.message || 'Unknown error connecting to backend');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-700 to-pink-600 text-white p-4 flex items-center shadow-md">
        <div className="text-2xl font-extrabold tracking-wide select-none">
          Theojnana
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto px-4 py-6 gap-6">
        <main className="flex-1 overflow-auto rounded-lg bg-white dark:bg-zinc-800 shadow-lg p-6 flex flex-col">
          <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-400">
            Prompt & Context Generator
          </h1>

          {/* Category Selector */}
          <div className="mb-6">
            <label className="block font-semibold mb-2">Select Category:</label>
            <select
              className="border rounded p-2 w-full max-w-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">-- Choose --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Templates */}
          {categoryId && (
            <div className="mb-6 flex flex-wrap items-center gap-4 max-w-sm">
              <select
                value={selectedTemplate}
                onChange={(e) => loadTemplate(e.target.value)}
                className="border p-2 rounded flex-grow"
                aria-label="Load Template"
              >
                <option value="">-- Load Template --</option>
                {templates
                  .filter((t) => t.categoryId === categoryId)
                  .map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={saveTemplate}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                title="Save current form as template"
              >
                Save Template
              </button>
              {selectedTemplate && (
                <button
                  onClick={() => deleteTemplate(selectedTemplate)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                  title="Delete selected template"
                >
                  Delete Template
                </button>
              )}
            </div>
          )}

          {/* Dynamic Form */}
          {categoryId && currentCategory && (
            <div className="space-y-5 max-w-xl">
              {currentCategory.fields.map(({ name, label }) => (
                <Input
                  key={name}
                  label={label}
                  name={name}
                  value={formData[name] || ''}
                  onChange={handleInputChange}
                />
              ))}
            </div>
          )}

          {/* Output */}
          {categoryId && (
            <>
              <section className="mt-8">
                <h2 className="font-semibold text-xl mb-2 text-indigo-600 dark:text-indigo-400">
                  Generated Context
                </h2>
                <pre className="bg-gray-100 dark:bg-zinc-900 p-4 rounded max-h-48 overflow-auto whitespace-pre-wrap text-sm">
                  {generateContext}
                </pre>
              </section>

              <section className="mt-6">
                <h2 className="font-semibold text-xl mb-2 text-indigo-600 dark:text-indigo-400">
                  Generated Prompts
                </h2>
                <pre className="bg-gray-100 dark:bg-zinc-900 p-4 rounded max-h-48 overflow-auto whitespace-pre-wrap text-sm">
                  {generatePrompts}
                </pre>
              </section>

              {/* Controls */}
              <div className="flex flex-wrap gap-3 mt-6 items-center">
                <button
                  onClick={copyToClipboard}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
                >
                  Copy All Text
                </button>
                <button
                  onClick={downloadTxt}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
                >
                  Download TXT
                </button>
                <button
                  onClick={downloadPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition"
                >
                  Download PDF
                </button>
                <button
                  onClick={addHistoryEntry}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                  title="Save to history"
                >
                  Save to History
                </button>
                <button
                  onClick={() => setHistoryVisible(!historyVisible)}
                  className="bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded transition"
                  title="Toggle History Panel"
                >
                  {historyVisible ? 'Hide History' : 'Show History'}
                </button>
                <button
                  onClick={fetchAICompletion}
                  disabled={aiLoading}
                  className={`ml-auto px-4 py-2 rounded text-white transition ${
                    aiLoading
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-pink-600 hover:bg-pink-700'
                  }`}
                  title="Generate Live AI Completion"
                >
                  {aiLoading ? 'Generating...' : 'Generate AI Preview'}
                </button>
              </div>

              {/* AI Result */}
              {aiError && (
                <div className="mt-4 p-3 bg-red-600 text-white rounded">
                  {aiError}
                </div>
              )}
              {aiResult && (
                <section className="mt-6 bg-zinc-800 text-zinc-100 rounded p-4 max-h-72 overflow-auto whitespace-pre-wrap">
                  <h3 className="font-semibold text-lg mb-2">
                    Live AI Completion
                  </h3>
                  <pre className="whitespace-pre-wrap">{aiResult}</pre>
                </section>
              )}
            </>
          )}
        </main>

        {/* Sidebar History */}
        {historyVisible && (
          <aside className="w-80 bg-white dark:bg-zinc-900 rounded-lg shadow-lg overflow-auto p-4">
            <h2 className="font-bold text-xl mb-4 text-indigo-600 dark:text-indigo-400">
              History
            </h2>
            {history.length === 0 ? (
              <p className="text-sm italic text-zinc-500">
                No history entries saved yet.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-300 dark:divide-zinc-700 max-h-[70vh] overflow-auto">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className={`p-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded flex flex-col ${
                      selectedHistoryId === entry.id
                        ? 'bg-indigo-200 dark:bg-indigo-700'
                        : ''
                    }`}
                    onClick={() => loadHistoryEntry(entry.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">
                          {entry.templateName || '(No Template)'}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {formatDate(entry.timestamp)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryEntry(entry.id);
                        }}
                        className="text-red-600 hover:text-red-800 ml-2"
                        title="Delete this entry"
                      >
                        &times;
                      </button>
                    </div>
                    <details className="mt-1">
                      <summary className="text-xs cursor-pointer select-none">
                        View Content
                      </summary>
                      <pre className="bg-gray-100 dark:bg-zinc-800 p-2 rounded mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                        {entry.context + '\n\n' + entry.prompts}
                      </pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 transition"
              >
                Clear History
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}) {
  const useTextarea =
    value.length > 40 ||
    label.toLowerCase().includes('description') ||
    label.toLowerCase().includes('features') ||
    label.toLowerCase().includes('goals') ||
    label.toLowerCase().includes('summary');

  return (
    <label className="block">
      <div className="font-semibold mb-1">{label}</div>
      {useTextarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          className="w-full border border-gray-300 dark:border-zinc-700 rounded p-2 resize-y bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-300 dark:border-zinc-700 rounded p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          placeholder={`Enter ${label.toLowerCase()}...`}
          autoComplete="off"
        />
      )}
    </label>
  );
}
