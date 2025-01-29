import toast from 'react-hot-toast';

interface ErrorLocation {
  file: string;
  function: string;
  operation: string;
}

export function handleError(error: any, location: ErrorLocation) {
  // Extract error details
  const errorMessage = error?.message || 'An unknown error occurred';
  const errorCode = error?.code;
  const details = error?.details;

  // Format the error location
  const locationStr = `${location.file} > ${location.function} > ${location.operation}`;

  // Log detailed error for debugging
  console.error('Error Details:', {
    location: locationStr,
    message: errorMessage,
    code: errorCode,
    details,
    stack: error?.stack,
    originalError: error
  });

  // Show user-friendly toast message
  toast.error(`Error in ${location.operation}: ${errorMessage}`);

  // Return formatted error for potential handling by caller
  return {
    message: errorMessage,
    code: errorCode,
    location: locationStr,
    details
  };
}