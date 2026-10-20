import React from 'react';
import {createRoot} from 'react-dom/client';
import Atlas from '../app/atlas-app';
import '../app/atlas.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><Atlas /></React.StrictMode>);
