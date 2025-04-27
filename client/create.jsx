import React from 'react';
import { BrowserRouter } from 'react-router-dom';

// Create the application with the provided context
export default function create(routes, context) {
  return (
    <BrowserRouter>
      <div id="app">
        {/* Your app content */}
        {routes}
      </div>
    </BrowserRouter>
  );
} 