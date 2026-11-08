'use client';

import { useState } from 'react';
import { AlertTriangle, Lock, Trash2, CheckCircle, Wallet } from 'lucide-react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialBalance, setInitialBalance] = useState('138.25');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setMessage('');
      } else {
        setMessage('Senha incorreta.');
      }
    } catch (e: any) {
      setMessage('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleWipeData = async () => {
    if (!confirm("Isso apagará TODAS as apostas, propostas, votos e a timeline de transações. Tem certeza?")) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim(), initialBalance: parseFloat(initialBalance) || 0 })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Banco de dados resetado com sucesso! Saldo inicial recriado.');
        window.dispatchEvent(new Event('balanceUpdated'));
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-neutral-400" size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-sm text-neutral-500 mb-6">Apenas administradores GO4ALL</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              placeholder="Senha de Admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition-colors"
            />
            <button disabled={loading} type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl transition-colors hover:bg-neutral-200">
              {loading ? 'Verificando...' : 'Acessar Painel'}
            </button>
          </form>
          {message && <p className="text-red-500 text-sm mt-4 font-bold">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-lg mx-auto px-4">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Lock className="text-red-500" /> Admin Dashboard
      </h2>
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 shadow-2xl shadow-red-900/20">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-sm text-red-300/80 mb-6 leading-relaxed">
          Esta ação vai limpar todo o banco de dados (apostas, votos, propostas e histórico de caixa).
          Use apenas antes de iniciar uma nova temporada ou para limpar testes massivos.
        </p>
        <div className="mb-6">
          <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider font-bold">Saldo Inicial a Restaurar (R$)</label>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </div>
        <button 
          onClick={handleWipeData}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/50"
        >
          {loading ? <span className="animate-pulse">Formatando banco...</span> : <><Trash2 size={18} /> WIPE DATA (Hard Reset)</>}
        </button>
        {message && (
          <div className={`mt-4 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.includes('Erro') ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50'}`}>
            {message.includes('Erro') ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
