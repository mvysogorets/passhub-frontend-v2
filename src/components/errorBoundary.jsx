// shamelesssly stolen from https://medium.com/@vdsnini/understanding-error-boundaries-in-react-js-0422a495d28b

import React, { useState, useEffect } from 'react';

function ErrorBoundary({ children }) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const errorHandler = (error, errorInfo) => {
            // Handle errors here
            console.log('Error caught by Error Boundary:', error, errorInfo);
            setHasError(true);
        };

        // Assign the error handler
        window.addEventListener('error', errorHandler);

        // Cleanup function
        return () => {
            window.removeEventListener('error', errorHandler);
        };
    }, []);

    if (hasError) {
        // Render fallback UI when an error occurs
        return <p>Something went wrong.</p>;
    }

    // Render children components as usual
    return children;
}

export default ErrorBoundary;
