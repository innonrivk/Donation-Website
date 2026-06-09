import { createContext, useContext, useState, useEffect } from 'react';
import { publicApi } from '../lib/api';

const ContentContext = createContext(null);

/**
 * Custom hook to consume dynamic website text content.
 * 
 * Why this hook? Centralizes the key-lookup logic. It guarantees that a synchronous 
 * fallback value is returned immediately, preventing layout shifts if the API fetch 
 * is still pending or if the network request fails.
 * 
 * @param {string} key - The lookup key for the content block (from CONTENT_KEYS).
 * @param {string} defaultValue - The hardcoded fallback copy if the key does not exist.
 * @returns {string} The parsed content string or the fallback default.
 */
export const useContent = (key, defaultValue) => {
  const content = useContext(ContentContext);
  if (!content) return defaultValue;
  return content[key] !== undefined ? content[key] : defaultValue;
};

/**
 * Context Provider that manages fetching and caching dynamic site content.
 * 
 * Why this provider? Wraps the application tree to manage the loading state and 
 * perform Stale-While-Revalidate caching. 
 * - It synchronously reads from localStorage on mount so that subsequent visits render 
 *   instantly without waiting for the network (eliminating Flash of Unstyled Content/FOUC).
 * - It fires a background fetch on mount to update the localStorage cache, preventing 
 *   mid-session content shifts by only applying updates on next load.
 * - It blocks initial render with a loader *only* on the first-ever visit when the cache is empty.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render.
 */
export const ContentProvider = ({ children }) => {
  const [content, setContent] = useState(() => {
    try {
      const cached = localStorage.getItem('site_content');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!content);

  useEffect(() => {
    /**
     * Fetches fresh site text from the server and caches it in localStorage.
     * 
     * Why background fetch? Ensures that the cache stays fresh for the user's next visit,
     * without blocking or shifting the layout of the current session.
     */
    const fetchContent = async () => {
      try {
        const { data } = await publicApi.get('/content/site-text');
        localStorage.setItem('site_content', JSON.stringify(data));
        
        // If we didn't have any cached content (first visit), we set it now to unblock rendering
        setContent((prev) => {
          if (!prev) return data;
          return prev; // Retain cached version for the rest of this session to prevent shifting
        });
      } catch (error) {
        console.error('Failed to sync dynamic site content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading && !content) {
    return (
      <div style={loaderStyles.container}>
        <div style={loaderStyles.spinner} />
        <p style={loaderStyles.text}>Loading amazing things...</p>
      </div>
    );
  }

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
};

const loaderStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0d0e12',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s ease-in-out infinite',
  },
  text: {
    marginTop: '16px',
    fontSize: '14px',
    letterSpacing: '0.05em',
    color: '#9ca3af',
  },
};

// Inject CSS animation for the spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
