import { useState } from 'react';
import { analyzeMessage } from '../lib/deepseek';
import { supabase } from '../lib/supabase';
import { handleError } from '@/lib/error-handler';

export function useMessageAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);

  const processNewMessage = async (
    threadId: string,
    content: string,
    propertyId: string,
    ownerId: string,
    userId: string
  ) => {
    setAnalyzing(true);
    try {
      // Get current user's workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('created_by', userId)
        .single();

      if (workspaceError) {
        throw handleError(workspaceError, {
          file: 'useMessageAnalysis.ts',
          function: 'processNewMessage',
          operation: 'get workspace'
        });
      }

      if (!workspace) {
        throw handleError(new Error('No workspace found'), {
          file: 'useMessageAnalysis.ts',
          function: 'processNewMessage',
          operation: 'validate workspace'
        });
      }

      // Store the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: ownerId,
          content,
          workspace_id: workspace.id
        });

      if (messageError) {
        throw handleError(messageError, {
          file: 'useMessageAnalysis.ts',
          function: 'processNewMessage',
          operation: 'store message'
        });
      }

      // Analyze the message
      const analysis = await analyzeMessage(content);

      // Update the message with analysis
      const { error: updateError } = await supabase
        .from('messages')
        .update({ ai_analysis: analysis })
        .eq('thread_id', threadId)
        .eq('content', content);

      if (updateError) {
        throw handleError(updateError, {
          file: 'useMessageAnalysis.ts',
          function: 'processNewMessage',
          operation: 'update message analysis'
        });
      }

      // If we have a clear status, update the property
      if (analysis.status && analysis.confidence > 0.7) {
        const { error: statusError } = await supabase
          .from('property_status_history')
          .insert({
            property_id: propertyId,
            status: analysis.status,
            changed_by: userId,
            source: 'ai',
            confidence: analysis.confidence,
            reasoning: analysis.reasoning
          });

        if (statusError) {
          throw handleError(statusError, {
            file: 'useMessageAnalysis.ts',
            function: 'processNewMessage',
            operation: 'update property status'
          });
        }
        
        // Update thread status
        const { error: threadError } = await supabase
          .from('message_threads')
          .update({ status: analysis.status })
          .eq('id', threadId);

        if (threadError) {
          throw handleError(threadError, {
            file: 'useMessageAnalysis.ts',
            function: 'processNewMessage',
            operation: 'update thread status'
          });
        }
      }

      return analysis;
    } catch (error) {
      // If error wasn't handled by handleError, handle it here
      if (!error.location) {
        handleError(error, {
          file: 'useMessageAnalysis.ts',
          function: 'processNewMessage',
          operation: 'unknown operation'
        });
      }
      throw error;
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    processNewMessage,
    analyzing
  };
}