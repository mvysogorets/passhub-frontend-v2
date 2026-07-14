import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App'
// import './style.css'
// import './index.css'

import { ErrorBoundary } from "react-error-boundary";

import { serverLog, serverLogPromise, logMeOut } from "./lib/utils";

const queryClient = new QueryClient();


function reportAndLogout(error) {
  serverLogPromise(`error ${error.message} ${error.stack}`)
    .finally(() => {
      logMeOut();
    })
}

function fallbackRender({ error, resetErrorBoundary }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  console.log('+------')
  console.log(error)
  console.log('------+')
  return (
    <>
      <div style={{ padding: 8 }}>
        <p><b>Something went wrong</b> (don't worry, your data is safe):</p>
        <p style={{ fontFamily: "monospace" }}>{error.message}</p>
        <div style={{ margin: "48px 0 16px 8px" }}><a style={{ color: "white" }} href="/logout.php">Logout Now</a></div>
        <div style={{ margin: "32px 0 16px 8px" }}><a style={{ color: "white", textDecoration: "underline" }} onClick={
          (e) => {
            e.preventDefault();
            reportAndLogout(error);
            return false;
          }} href="/logout.php">Report & Logout</a>
        </div>
      </div>
    </>
  );
}

/*
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallbackRender={fallbackRender}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
)
*/

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)

