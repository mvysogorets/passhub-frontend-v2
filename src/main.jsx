import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App'
// import './style.css'
// import './index.css'

import { ErrorBoundary } from "react-error-boundary";

const queryClient = new QueryClient();



function fallbackRender({ error, resetErrorBoundary }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  console.log('+------')
  console.log(error)
  console.log('------+')
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <p style={{ fontFamily: "monospace" }}>{error.message}</p>
      {/*<p style={{ fontFamily: "monospace" }}>{error.stack}</p>*/}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallbackRender={fallbackRender}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
)
