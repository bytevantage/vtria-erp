import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ComponentTemplate.css';

/**
 * ComponentTemplate - VTRIA ERP Component Template
 * 
 * @description Brief description of what this component does
 * @param {Object} props - Component props
 * @param {string} props.title - Component title
 * @param {Function} props.onAction - Callback function for actions
 * @param {Array} props.data - Data array for the component
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} React component
 * 
 * @example
 * <ComponentTemplate
 *   title="User Dashboard"
 *   data={users}
 *   isLoading={false}
 *   onAction={handleUserAction}
 * />
 */
const ComponentTemplate = ({
  title = 'Default Title',
  onAction,
  data = [],
  isLoading = false,
  className = '',
  children,
}) => {
  // State management
  const [localState, setLocalState] = useState(null);
  const [error, setError] = useState(null);

  // Effects
  useEffect(() => {
    // Component initialization logic
    console.log('ComponentTemplate mounted with title:', title);
    
    return () => {
      // Cleanup logic
      console.log('ComponentTemplate unmounted');
    };
  }, [title]);

  // Event handlers
  const handleAction = async (actionData) => {
    try {
      setError(null);
      if (onAction) {
        await onAction(actionData);
      }
    } catch (err) {
      setError(err.message);
      console.error('Action failed:', err);
    }
  };

  // Helper functions
  const formatData = (item) => {
    // Data formatting logic
    return item;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`component-template loading ${className}`}>
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`component-template error ${className}`}>
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Retry</button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className={`component-template ${className}`}>
      <header className="component-header">
        <h2>{title}</h2>
      </header>
      
      <main className="component-content">
        {data.length > 0 ? (
          <ul className="data-list">
            {data.map((item, index) => (
              <li key={item.id || index} className="data-item">
                {formatData(item)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <p>No data available</p>
          </div>
        )}
        
        {children}
      </main>
      
      <footer className="component-actions">
        <button 
          onClick={() => handleAction({ type: 'primary' })}
          className="btn btn-primary"
        >
          Primary Action
        </button>
      </footer>
    </div>
  );
};

// PropTypes validation
ComponentTemplate.propTypes = {
  title: PropTypes.string,
  onAction: PropTypes.func,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

// Default props
ComponentTemplate.defaultProps = {
  title: 'Default Title',
  onAction: null,
  data: [],
  isLoading: false,
  className: '',
  children: null,
};

export default ComponentTemplate;