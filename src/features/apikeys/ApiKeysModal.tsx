import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Key,
  Plus,
  Check,
  Trash2,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  Bot,
  Zap,
  Brain,
  Cpu,
  Layers,
  Server,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { projectStore, useProjectStore } from '../../store/projectStore';
import { ApiKeyConfig, LlmProvider, PROVIDER_PRESETS } from './apiKeys.types';

export const ApiKeysModal: React.FC = () => {
  const { isApiKeysOpen, apiKeys } = useProjectStore();
  const keysList = apiKeys || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<LlmProvider | 'all'>('all');
  const [editingKey, setEditingKey] = useState<ApiKeyConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showKeySecrets, setShowKeySecrets] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form states
  const [formProvider, setFormProvider] = useState<LlmProvider>('gemini');
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isApiKeysOpen) {
        if (editingKey) {
          setEditingKey(null);
        } else {
          projectStore.toggleApiKeys(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isApiKeysOpen, editingKey]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleShowSecret = (id: string) => {
    setShowKeySecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const defaultKey = useMemo(() => {
    return keysList.find((k) => k.isDefault) || keysList.find((k) => k.isActive) || keysList[0];
  }, [keysList]);

  const filteredKeys = useMemo(() => {
    return keysList.filter((k) => {
      const matchesProvider = selectedProviderFilter === 'all' || k.provider === selectedProviderFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesProvider;
      return (
        matchesProvider &&
        (k.name.toLowerCase().includes(q) ||
          k.modelName.toLowerCase().includes(q) ||
          k.provider.toLowerCase().includes(q))
      );
    });
  }, [keysList, selectedProviderFilter, searchQuery]);

  const handleOpenCreateNew = (presetProvider?: LlmProvider) => {
    const prov = presetProvider || 'gemini';
    const preset = PROVIDER_PRESETS.find((p) => p.provider === prov) || PROVIDER_PRESETS[0];

    setFormProvider(prov);
    setFormName(`${preset.displayName} Key`);
    setFormKey('');
    setFormModel(preset.defaultModel);
    setFormBaseUrl(preset.defaultBaseUrl || '');
    setFormIsActive(true);
    setFormIsDefault(keysList.length === 0);
    setIsCreating(true);
    setEditingKey(null);
  };

  const handleOpenEdit = (key: ApiKeyConfig) => {
    setEditingKey(key);
    setFormProvider(key.provider);
    setFormName(key.name);
    setFormKey(key.apiKey);
    setFormModel(key.modelName);
    setFormBaseUrl(key.baseUrl || '');
    setFormIsActive(key.isActive);
    setFormIsDefault(key.isDefault);
    setIsCreating(false);
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Key name is required');
      return;
    }
    if (formKey.trim().length < 30) {
      showToast('⚠️ Warning: your API key looks too short — it may be truncated. Please re-paste the full key.');
      return;
    }

    const idToUse = editingKey ? editingKey.id : `key-${Date.now()}`;

    const configToSave: ApiKeyConfig = {
      id: idToUse,
      provider: formProvider,
      name: formName.trim(),
      apiKey: formKey.trim(),
      modelName: formModel.trim() || 'default-model',
      baseUrl: formBaseUrl.trim() || undefined,
      isActive: formIsActive,
      isDefault: formIsDefault,
      createdAt: editingKey ? editingKey.createdAt : new Date().toISOString(),
      lastTestedAt: editingKey?.lastTestedAt,
      testStatus: editingKey?.testStatus || 'untested',
    };

    projectStore.saveApiKey(configToSave);
    showToast(`Saved key "${formName}"`);
    setIsCreating(false);
    setEditingKey(null);
  };

  const handleDeleteKey = (id: string, name: string) => {
    if (keysList.length <= 1) {
      showToast('Cannot delete the last remaining key');
      return;
    }
    projectStore.deleteApiKey(id);
    showToast(`Deleted key "${name}"`);
  };

  const handleSetDefault = (id: string, name: string) => {
    projectStore.setDefaultApiKey(id);
    showToast(`Set "${name}" as default primary model`);
  };

  const handleToggleActive = (id: string) => {
    projectStore.toggleApiKeyActive(id);
  };

  const handleTestKey = async (id: string) => {
    setTestingId(id);
    const target = keysList.find((k) => k.id === id);
    if (!target) {
      setTestingId(null);
      return;
    }
    
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: target.provider, apiKey: target.apiKey, model: target.modelName, baseUrl: target.baseUrl })
      });
      const data = await res.json();
      
      const isValid = data.valid;
      const updated = {
        ...target,
        testStatus: (isValid ? 'valid' : 'invalid') as 'valid' | 'invalid',
        lastTestedAt: new Date().toISOString(),
      };
      projectStore.saveApiKey(updated);
      
      if (isValid) {
        showToast(`Connection verified for ${target.name}!`);
      } else {
        showToast(`Test failed: ${data.error || 'Invalid API Key'}`);
      }
    } catch (err) {
      showToast(`Network error testing connection`);
    } finally {
      setTestingId(null);
    }
  };

  const renderProviderIcon = (provider: LlmProvider, className = 'w-4 h-4') => {
    switch (provider) {
      case 'gemini':
        return <Sparkles className={`${className} text-zinc-300`} />;
      case 'openai':
        return <Bot className={`${className} text-zinc-300`} />;
      case 'anthropic':
        return <Zap className={`${className} text-zinc-300`} />;
      case 'deepseek':
        return <Brain className={`${className} text-zinc-300`} />;
      case 'groq':
        return <Cpu className={`${className} text-zinc-300`} />;
      case 'mistral':
        return <Layers className={`${className} text-zinc-300`} />;
      case 'ollama':
        return <Server className={`${className} text-zinc-300`} />;
      case 'custom':
        return <Globe className={`${className} text-zinc-300`} />;
      default:
        return <Key className={`${className} text-zinc-300`} />;
    }
  };

  if (!isApiKeysOpen) return null;

  return (
    <div
      id="modal-apikeys-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
      onClick={() => projectStore.toggleApiKeys(false)}
    >
      <div
        id="modal-apikeys-container"
        className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] max-h-[720px] flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Sleek Minimalist Theme */}
        <header className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-200">
              <Key className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Multi-Model LLM API Key Management</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-semibold">
                  Multi-Provider Support
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Configure keys for Gemini, OpenAI, Claude, DeepSeek, Groq, Ollama, & custom models
              </p>
            </div>
          </div>

          <button
            onClick={() => projectStore.toggleApiKeys(false)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Primary Engine Banner */}
        <div className="px-5 py-2.5 bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 font-medium">Active Primary LLM Engine:</span>
            {defaultKey ? (
              <span className="font-bold text-white bg-zinc-900 border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-mono text-[11px]">
                {renderProviderIcon(defaultKey.provider, 'w-3.5 h-3.5')}
                <span>{defaultKey.name}</span>
                <span className="text-zinc-400 font-normal">({defaultKey.modelName})</span>
              </span>
            ) : (
              <span className="text-zinc-500 italic">No key active</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono">
            <span>{keysList.filter((k) => k.isActive).length} / {keysList.length} Keys Active</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {notification && (
            <div className="p-3 bg-zinc-800 border border-white/10 rounded-xl text-xs text-zinc-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-zinc-300" />
              <span>{notification}</span>
            </div>
          )}

          {/* Form Modal / Overlay when Editing or Creating */}
          {isCreating || editingKey ? (
            <form onSubmit={handleSaveKey} className="p-5 bg-[#0a0a0a] border border-white/10 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-300" />
                  <span>{isCreating ? 'Add New LLM Provider Key' : `Edit "${editingKey?.name}"`}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingKey(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Provider Type</label>
                  <select
                    value={formProvider}
                    onChange={(e) => {
                      const prov = e.target.value as LlmProvider;
                      setFormProvider(prov);
                      const preset = PROVIDER_PRESETS.find((p) => p.provider === prov);
                      if (preset) {
                        setFormName(`${preset.displayName} Key`);
                        setFormModel(preset.defaultModel);
                        setFormBaseUrl(preset.defaultBaseUrl || '');
                      }
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                  >
                    {PROVIDER_PRESETS.map((p) => (
                      <option key={p.provider} value={p.provider}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Display Label</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. My Personal Gemini Key"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-zinc-400 font-medium mb-1">Model String</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="e.g. gpt-4o, gemini-2.5-flash"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-zinc-400 font-medium mb-1">Base URL <span className="text-zinc-600 font-normal">(Optional proxy)</span></label>
                  <input
                    type="text"
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder="e.g. https://api.openai.com/v1"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-medium mb-1">API Secret Key</label>
                  <input
                    type="password"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="Paste your secret API key here..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded bg-zinc-900 border-white/10 text-zinc-100"
                    />
                    <span className="text-zinc-300">Enable this key for AI partner execution</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="rounded bg-zinc-900 border-white/10 text-zinc-100"
                    />
                    <span className="text-zinc-300 font-semibold">Set as primary default model</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingKey(null);
                  }}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save API Key</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Quick Preset Selector Buttons (Neat Monochrome Design) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Quick Add Model Presets</span>
                  </span>
                  <button
                    onClick={() => handleOpenCreateNew('custom')}
                    className="px-3 py-1 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Key</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROVIDER_PRESETS.map((preset) => (
                    <button
                      key={preset.provider}
                      onClick={() => handleOpenCreateNew(preset.provider)}
                      className="p-2.5 bg-[#0a0a0a] border border-white/10 hover:border-zinc-500 rounded-xl text-left transition-all hover:bg-zinc-800/60 group"
                    >
                      <div className="flex items-center gap-2">
                        {renderProviderIcon(preset.provider, 'w-4 h-4')}
                        <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                          + {preset.displayName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search API keys or models..."
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Provider Filters (Monochrome Pills) */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    onClick={() => setSelectedProviderFilter('all')}
                    className={`px-3 py-1 rounded-xl font-medium transition-colors shrink-0 ${
                      selectedProviderFilter === 'all'
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#0a0a0a] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    All Keys ({keysList.length})
                  </button>
                  {(['gemini', 'openai', 'anthropic', 'deepseek'] as const).map((p) => {
                    const count = keysList.filter((k) => k.provider === p).length;
                    const preset = PROVIDER_PRESETS.find((pr) => pr.provider === p);
                    return (
                      <button
                        key={p}
                        onClick={() => setSelectedProviderFilter(p)}
                        className={`px-3 py-1 rounded-xl font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                          selectedProviderFilter === p
                            ? 'bg-white text-black font-bold'
                            : 'bg-[#0a0a0a] text-zinc-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {renderProviderIcon(p, 'w-3 h-3')}
                        <span>{preset?.displayName} ({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Keys List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {filteredKeys.map((keyItem) => {
                  const isPrimary = keyItem.isDefault;
                  const isSecretShown = Boolean(showKeySecrets[keyItem.id]);

                  return (
                    <div
                      key={keyItem.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isPrimary
                          ? 'bg-[#0a0a0a] border-zinc-600 shadow-md'
                          : keyItem.isActive
                          ? 'bg-[#0a0a0a] border-white/10 hover:border-zinc-700'
                          : 'bg-[#0a0a0a]/50 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 shrink-0">
                            {renderProviderIcon(keyItem.provider, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{keyItem.name}</span>
                              {isPrimary && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                                  PRIMARY
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] font-mono text-zinc-400 truncate">
                              Model: {keyItem.modelName}
                            </p>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={keyItem.isActive}
                            onChange={() => handleToggleActive(keyItem.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-zinc-200" />
                        </label>
                      </div>

                      {/* Secret Preview */}
                      <div className="p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl flex items-center justify-between gap-2 text-[11px] font-mono mb-3">
                        <span className="text-zinc-300 truncate">
                          {keyItem.apiKey
                            ? isSecretShown
                              ? keyItem.apiKey
                              : `${keyItem.apiKey.slice(0, 6)}••••••••••••`
                            : 'No key string entered'}
                        </span>
                        {keyItem.apiKey && (
                          <button
                            onClick={() => toggleShowSecret(keyItem.id)}
                            className="p-1 text-zinc-400 hover:text-white rounded shrink-0"
                            title={isSecretShown ? 'Hide Secret' : 'Reveal Secret'}
                          >
                            {isSecretShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Bottom Card Controls */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5">
                          {/* Set Primary Default */}
                          {!isPrimary && (
                            <button
                              onClick={() => handleSetDefault(keyItem.id, keyItem.name)}
                              className="px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-colors border border-white/10"
                            >
                              Make Primary
                            </button>
                          )}

                          {/* Test Connection */}
                          <button
                            onClick={() => handleTestKey(keyItem.id)}
                            disabled={testingId === keyItem.id}
                            className="px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-colors border border-white/10 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${testingId === keyItem.id ? 'animate-spin' : ''}`} />
                            <span>{testingId === keyItem.id ? 'Testing...' : 'Test Connection'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(keyItem)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Edit Configuration"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKey(keyItem.id, keyItem.name)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                            title="Delete Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
