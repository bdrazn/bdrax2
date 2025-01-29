import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/error-handler';

interface Template {
  id: string;
  name: string;
  messages: { content: string }[];
  delivery_strategy: 'sequential' | 'random';
  created_at: string;
}

export function useTemplates() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw handleError(new Error('Not authenticated'), {
            file: 'use-templates.ts',
            function: 'queryFn',
            operation: 'get user'
          });
        }

        // Get user's workspace
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('created_by', user.id)
          .single();

        if (workspaceError) {
          throw handleError(workspaceError, {
            file: 'use-templates.ts',
            function: 'queryFn',
            operation: 'get workspace'
          });
        }

        if (!workspace) {
          throw handleError(new Error('No workspace found'), {
            file: 'use-templates.ts',
            function: 'queryFn',
            operation: 'validate workspace'
          });
        }

        const { data, error } = await supabase
          .from('message_templates')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw handleError(error, {
            file: 'use-templates.ts',
            function: 'queryFn',
            operation: 'fetch templates'
          });
        }

        return data;
      } catch (error) {
        if (!error.location) {
          handleError(error, {
            file: 'use-templates.ts',
            function: 'queryFn',
            operation: 'unknown operation'
          });
        }
        throw error;
      }
    }
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<Template, 'id' | 'created_at'>) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get user's workspace
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('created_by', user.id)
          .single();

        if (!workspace) throw new Error('No workspace found');

        const { data, error } = await supabase
          .from('message_templates')
          .insert({
            ...template,
            workspace_id: workspace.id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        handleError(error, {
          file: 'use-templates.ts',
          function: 'createTemplate',
          operation: 'create template'
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created successfully');
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Template> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      handleError(error, {
        file: 'use-templates.ts',
        function: 'updateTemplate',
        operation: 'update template'
      });
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      handleError(error, {
        file: 'use-templates.ts',
        function: 'deleteTemplate',
        operation: 'delete template'
      });
    }
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
}