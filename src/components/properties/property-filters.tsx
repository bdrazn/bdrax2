import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { Combobox } from '../ui/combobox';

interface List {
  id: string;
  name: string;
  property_count: number;
}

interface PropertyFilters {
  units: string;
  status: string;
  list: string[];
  tag: string[];
}

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFilterChange: (filters: PropertyFilters) => void;
  onAddToList: (listId: string) => void;
  onAddToTag: (tag: string) => void;
  selectedCount: number;
}

const PROPERTY_STATUS = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'dnc', label: 'DNC' }
];

export function PropertyFilters({
  filters,
  onFilterChange,
  onAddToList,
  onAddToTag,
  selectedCount
}: PropertyFiltersProps) {
  const { session } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (session) {
      loadListsAndTags();
    }
  }, [session]);

  const loadListsAndTags = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      // Load lists
      const { data: listsData } = await supabase
        .from('property_lists')
        .select(`
          id,
          name,
          properties:property_list_items(count)
        `)
        .eq('workspace_id', workspace.workspace_id);

      if (listsData) {
        setLists(listsData.map(list => ({
          id: list.id,
          name: list.name,
          property_count: list.properties?.[0]?.count || 0
        })));
      }

      // Load tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('name')
        .eq('workspace_id', workspace.workspace_id);

      if (tagsData) {
        setTags(tagsData.map(t => t.name));
      }
    } catch (error) {
      console.error('Error loading lists and tags:', error);
    }
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow p-4 space-y-6">
      <div className="flex items-center gap-2 text-gray-700">
        <Filter className="w-5 h-5" />
        <h3 className="font-medium">Filters</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Minimum Units
        </label>
        <input
          type="number"
          value={filters.units}
          onChange={(e) => onFilterChange({ ...filters, units: e.target.value })}
          min="1"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lead Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
        >
          <option value="">All Status</option>
          {PROPERTY_STATUS.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lists
        </label>
        <Combobox
          options={lists.map(list => ({
            value: list.id,
            label: `${list.name} (${list.property_count})`
          }))}
          value={filters.list}
          onChange={(value) => onFilterChange({ ...filters, list: value })}
          placeholder="Select lists..."
          className="w-full"
          multiple
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <Combobox
          options={tags.map(tag => ({
            value: tag,
            label: tag
          }))}
          value={filters.tag}
          onChange={(value) => onFilterChange({ ...filters, tag: value })}
          placeholder="Select tags..."
          className="w-full"
          multiple
        />
      </div>

      {selectedCount > 0 && (
        <div className="pt-4 border-t space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add to List
            </label>
            <Combobox
              options={lists.map(list => ({
                value: list.id,
                label: list.name
              }))}
              value={[]}
              onChange={(value) => value[0] && onAddToList(value[0])}
              placeholder="Select a list..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Tag
            </label>
            <Combobox
              options={tags.map(tag => ({
                value: tag,
                label: tag
              }))}
              value={[]}
              onChange={(value) => value[0] && onAddToTag(value[0])}
              placeholder="Select a tag..."
              className="w-full"
            />
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => onFilterChange({
          units: '',
          status: '',
          list: [],
          tag: []
        })}
      >
        Clear Filters
      </Button>
    </div>
  );
}