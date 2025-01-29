import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Building2, Users, MessageSquare, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'property' | 'contact' | 'message' | 'deal';
  title: string;
  subtitle?: string;
  href: string;
}

interface SearchProps {
  mode?: 'global' | 'page';
  placeholder?: string;
  onSearch?: (term: string) => void;
  className?: string;
}

export function Search({ mode = 'global', placeholder, onSearch, className }: SearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm || mode !== 'global') {
      setResults([]);
      return;
    }

    const searchData = async () => {
      setLoading(true);
      try {
        const { data: workspace } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!workspace) return;

        const searchResults: SearchResult[] = [];

        // Search properties
        const { data: properties } = await supabase
          .from('properties')
          .select('id, address, city, state')
          .eq('workspace_id', workspace.workspace_id)
          .or(`address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
          .limit(5);

        if (properties) {
          searchResults.push(...properties.map(p => ({
            id: p.id,
            type: 'property' as const,
            title: p.address,
            subtitle: `${p.city}, ${p.state}`,
            href: `/properties?search=${encodeURIComponent(p.address)}`
          })));
        }

        // Search contacts
        const { data: contacts } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, business_name')
          .eq('workspace_id', workspace.workspace_id)
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,business_name.ilike.%${searchTerm}%`)
          .limit(5);

        if (contacts) {
          searchResults.push(...contacts.map(c => ({
            id: c.id,
            type: 'contact' as const,
            title: `${c.first_name} ${c.last_name}`,
            subtitle: c.business_name || undefined,
            href: `/contacts?search=${encodeURIComponent(`${c.first_name} ${c.last_name}`)}`
          })));
        }

        // Search messages - using ilike instead of full-text search
        const { data: messages } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            thread:message_threads(
              contact:profiles(
                first_name,
                last_name
              )
            )
          `)
          .ilike('content', `%${searchTerm}%`)
          .limit(5);

        if (messages) {
          searchResults.push(...messages.map(m => ({
            id: m.id,
            type: 'message' as const,
            title: m.thread?.contact?.first_name 
              ? `${m.thread.contact.first_name} ${m.thread.contact.last_name}`
              : 'Message',
            subtitle: m.content.length > 60 ? m.content.slice(0, 60) + '...' : m.content,
            href: `/messages?thread=${m.thread?.id}`
          })));
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, mode]);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'property':
        return Building2;
      case 'contact':
        return Users;
      case 'message':
        return MessageSquare;
      case 'deal':
        return DollarSign;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (mode === 'page' && onSearch) {
              onSearch(e.target.value);
            } else {
              setIsOpen(true);
            }
          }}
          onFocus={() => mode === 'global' && setIsOpen(true)}
          placeholder={placeholder || "Search properties, contacts, messages..."}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              if (onSearch) onSearch('');
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && mode === 'global' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50"
          >
            <div className="p-2">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600 mx-auto" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map(result => {
                    const Icon = getIcon(result.type);
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full p-2 text-left hover:bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Icon className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchTerm ? (
                <div className="p-4 text-center text-gray-500">
                  No results found for "{searchTerm}"
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}