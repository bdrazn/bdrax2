import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/error-handler';

interface MessageWheel {
  id: string;
  name: string;
  messages: { content: string }[];
  active_count: number;
  mode: 'sequential' | 'random';
  created_at: string;
}

export function useMessageWheel() {
  const queryClient = useQueryClient();

  const { data: wheels, isLoading } = useQuery({
    queryKey: ['message-wheels'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw handleError(new Error('Not authenticated'), {
            file: 'use-message-wheel.ts',
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
            file: 'use-message-wheel.ts',
            function: 'queryFn',
            operation: 'get workspace'
          });
        }

        if (!workspace) {
          throw handleError(new Error('No workspace found'), {
            file: 'use-message-wheel.ts',
            function: 'queryFn',
            operation: 'validate workspace'
          });
        }

        const { data, error } = await supabase
          .from('message_wheels')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw handleError(error, {
            file: 'use-message-wheel.ts',
            function: 'queryFn',
            operation: 'fetch message wheels'
          });
        }

        return data;
      } catch (error) {
        if (!error.location) {
          handleError(error, {
            file: 'use-message-wheel.ts',
            function: 'queryFn',
            operation: 'unknown operation'
          });
        }
        throw error;
      }
    }
  });

  const createWheel = useMutation({
    mutationFn: async (wheel: Omit<MessageWheel, 'id' | 'created_at'>) => {
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
          .from('message_wheels')
          .insert({
            ...wheel,
            workspace_id: workspace.id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        handleError(error, {
          file: 'use-message-wheel.ts',
          function: 'createWheel',
          operation: 'create message wheel'
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-wheels'] });
      toast.success('Message wheel created successfully');
    }
  });

  const updateWheel = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageWheel> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_wheels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-wheels'] });
      toast.success('Message wheel updated successfully');
    },
    onError: (error) => {
      handleError(error, {
        file: 'use-message-wheel.ts',
        function: 'updateWheel',
        operation: 'update message wheel'
      });
    }
  });

  const deleteWheel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_wheels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-wheels'] });
      toast.success('Message wheel deleted successfully');
    },
    onError: (error) => {
      handleError(error, {
        file: 'use-message-wheel.ts',
        function: 'deleteWheel',
        operation: 'delete message wheel'
      });
    }
  });

  return {
    wheels,
    isLoading,
    createWheel,
    updateWheel,
    deleteWheel
  };
}