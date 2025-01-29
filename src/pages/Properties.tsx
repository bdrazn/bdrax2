import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Plus, Building2 } from 'lucide-react';
import { PropertyFilters } from '@/components/properties/property-filters';
import { PropertyDetails } from '@/components/properties/property-details';
import { PropertyList } from '@/components/properties/property-list';
import { Button } from '@/components/ui/button';
import { Search } from '@/components/ui/search';
import toast from 'react-hot-toast';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  units: number;
  lead_status: string;
  tags: string[];
}

export default function Properties() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [viewingProperty, setViewingProperty] = useState<string | null>(null);
  const [totalProperties, setTotalProperties] = useState(0);
  const [filters, setFilters] = useState({
    units: '',
    status: '',
    list: '',
    tag: ''
  });

  useEffect(() => {
    if (session) {
      loadProperties();
      getTotalProperties();
    }
  }, [session]);

  const getTotalProperties = async () => {
    try {
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalProperties(count || 0);
    } catch (error) {
      console.error('Error getting total properties:', error);
    }
  };

  const loadProperties = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      // Get properties with their tags
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_tags (
            tag:tags (
              id,
              name
            )
          )
        `)
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include tags
      const transformedData = data?.map(property => ({
        ...property,
        tags: property.property_tags?.map((pt: any) => pt.tag.name) || []
      }));

      setProperties(transformedData || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handlePropertySelect = (id: string) => {
    setSelectedProperties(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const visibleProperties = filteredProperties.map(p => p.id);
      setSelectedProperties(new Set(visibleProperties));
    } else {
      setSelectedProperties(new Set());
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Property deleted successfully');
      loadProperties();
      setSelectedProperties(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      toast.error('Failed to delete property');
    }
  };

  const handleAddToList = async (listId: string) => {
    if (selectedProperties.size === 0) return;

    try {
      const items = Array.from(selectedProperties).map(propertyId => ({
        list_id: listId,
        property_id: propertyId
      }));

      const { error } = await supabase
        .from('property_list_items')
        .upsert(items);

      if (error) throw error;

      toast.success(`Added ${selectedProperties.size} properties to list`);
      setSelectedProperties(new Set());
    } catch (error) {
      console.error('Error adding to list:', error);
      toast.error('Failed to add properties to list');
    }
  };

  const handleAddToTag = async (tagName: string) => {
    if (selectedProperties.size === 0) return;

    try {
      // Get workspace ID
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // Get or create tag
      let tag: Tag;
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id, name')
        .eq('workspace_id', workspace.workspace_id)
        .eq('name', tagName)
        .single();

      if (existingTag) {
        tag = existingTag;
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({
            workspace_id: workspace.workspace_id,
            name: tagName
          })
          .select()
          .single();

        if (tagError) throw tagError;
        tag = newTag;
      }

      // Add tag to selected properties
      const propertyTags = Array.from(selectedProperties).map(propertyId => ({
        property_id: propertyId,
        tag_id: tag.id
      }));

      const { error: relationError } = await supabase
        .from('property_tags')
        .upsert(propertyTags);

      if (relationError) throw relationError;

      toast.success(`Added tag to ${selectedProperties.size} properties`);
      setSelectedProperties(new Set());
      loadProperties();
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag to properties');
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = !searchTerm || 
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.zip.includes(searchTerm);

    const matchesUnits = !filters.units || property.units >= parseInt(filters.units);
    const matchesStatus = !filters.status || property.lead_status === filters.status;

    return matchesSearch && matchesUnits && matchesStatus;
  });

  return (
    <div className="flex gap-6">
      <PropertyFilters
        filters={filters}
        onFilterChange={setFilters}
        onAddToList={handleAddToList}
        onAddToTag={handleAddToTag}
        selectedCount={selectedProperties.size}
      />

      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Search 
              mode="page"
              placeholder="Search properties..."
              onSearch={handleSearch}
              className="max-w-lg"
            />
            <div className="flex items-center gap-2 text-gray-500">
              <Building2 className="w-5 h-5" />
              <span className="font-medium">{totalProperties} Total Properties</span>
            </div>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          )}
        </div>

        <PropertyList
          properties={filteredProperties}
          selectedProperties={selectedProperties}
          onPropertySelect={handlePropertySelect}
          onSelectAll={handleSelectAll}
          onViewDetails={(id) => setViewingProperty(id)}
          onEdit={(property) => {
            // Handle edit
          }}
          onDelete={handleDelete}
        />
      </div>

      {viewingProperty && (
        <PropertyDetails
          propertyId={viewingProperty}
          isOpen={true}
          onClose={() => setViewingProperty(null)}
        />
      )}
    </div>
  );
}