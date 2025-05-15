import React from 'react';
import ReactDOM from 'react-dom/client'; // Use 'react-dom/client' for React 18+
import MidiDB from './MidiDB';

const rootElement = document.getElementById('root'); // Get the root element
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement); // Create a root
    root.render(
        <React.StrictMode>
            <MidiDB />
        </React.StrictMode>
    );
}