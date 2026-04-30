import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BRANDING } from './config/branding';

document.documentElement.style.setProperty('--color-apex-trader-primary', BRANDING.primaryColor);
document.title = BRANDING.appName;
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BRANDING.primaryColor);
document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', BRANDING.appName);
document.querySelector('meta[property="og:title"]')?.setAttribute('content', BRANDING.appName);
document.querySelector('meta[property="og:image"]')?.setAttribute('content', BRANDING.ogImageUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
