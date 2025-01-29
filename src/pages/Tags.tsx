import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import toast from 'react-hot-toast';

interface Tag {
  id: string;
  name: string;
  description: string | null;
  property_count: number;
  created_at: string;
}

export default function Tags() {
  const { session } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTag, setCurrentTag] = useState({
    id: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    if (session) {
      loadTags();
    }
  }, [session]);

  const loadTags = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { data, error } = await supabase
        .from('tags')
        .select(`
          *,
          properties:property_tags(count)
        `)
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTags(data.map(tag => ({
        ...tag,
        property_count: tag.properties?.[0]?.count || 0
      })));
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTag.name.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { error } = await supabase
        .from('tags')
        .upsert({
          id: currentTag.id || undefined,
          workspace_id: workspace.workspace_id,
          name: currentTag.name.trim(),
          description: currentTag.description.trim() || null
        });

      if (error) throw error;

      toast.success(currentTag.id ? 'Tag updated successfully' : 'Tag created successfully');
      loadTags();
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save tag');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all properties.')) return;

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Tag deleted successfully');
      loadTags();
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const resetForm = () => {
    setCurrentTag({
      id: '',
      name: '',
      description: ''
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Property Tags</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Tag
          </Button>
        )}
      </div>

      {isEditing && (
        <Modal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title={currentTag.id ? 'Edit Tag' : 'Create New Tag'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tag Name
              </label>
              <input
                type="text"
                value={currentTag.name}
                onChange={(e) => setCurrentTag({ ...currentTag, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                placeholder="Enter tag name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={currentTag.description}
                onChange={(e) => setCurrentTag({ ...currentTag, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {currentTag.id ? 'Update Tag' : 'Create Tag'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">All Tags</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto" />
          </div>
        ) : tags.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tags found
          </div>
        ) : (
          <div className="divide-y">
            {tags.map(tag => (
              <div key={tag.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-gray-400" />
                      <h3 className="font-medium text-gray-900">{tag.name}</h3>
                    </div>
                    {tag.description && (
                      <p className="mt-1 text-sm text-gray-500">{tag.description}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      {tag.property_count} {tag.property_count === 1 ? 'property' : 'properties'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCurrentTag({
                          id: tag.id,
                          name: tag.name,
                          description: tag.description || ''
                        });
                        setIsEditing(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}