import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentTemplate from '../templates/ComponentTemplate';

// Mock data for testing
const mockData = [
  { id: 1, name: 'Test Item 1' },
  { id: 2, name: 'Test Item 2' },
  { id: 3, name: 'Test Item 3' },
];

describe('ComponentTemplate', () => {
  const defaultProps = {
    title: 'Test Component',
    data: mockData,
    isLoading: false,
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<ComponentTemplate {...defaultProps} />);
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('Primary Action')).toBeInTheDocument();
    });

    it('renders data items correctly', () => {
      render(<ComponentTemplate {...defaultProps} />);
      
      mockData.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      });
    });

    it('displays empty state when no data', () => {
      render(<ComponentTemplate {...defaultProps} data={[]} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ComponentTemplate {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders children when provided', () => {
      render(
        <ComponentTemplate {...defaultProps}>
          <div>Child Content</div>
        </ComponentTemplate>
      );
      
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<ComponentTemplate {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Test Component')).not.toBeInTheDocument();
    });

    it('has loading class when isLoading is true', () => {
      const { container } = render(
        <ComponentTemplate {...defaultProps} isLoading={true} />
      );
      
      expect(container.firstChild).toHaveClass('loading');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when action fails', async () => {
      const mockOnAction = jest.fn().mockRejectedValue(new Error('Test error'));
      
      render(<ComponentTemplate {...defaultProps} onAction={mockOnAction} />);
      
      const actionButton = screen.getByText('Primary Action');
      fireEvent.click(actionButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });

    it('can retry after error', async () => {
      const mockOnAction = jest.fn().mockRejectedValue(new Error('Test error'));
      
      render(<ComponentTemplate {...defaultProps} onAction={mockOnAction} />);
      
      // Trigger error
      fireEvent.click(screen.getByText('Primary Action'));
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
      
      // Click retry
      fireEvent.click(screen.getByText('Retry'));
      
      // Should show main content again
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onAction when action button is clicked', async () => {
      const mockOnAction = jest.fn().mockResolvedValue();
      
      render(<ComponentTemplate {...defaultProps} onAction={mockOnAction} />);
      
      const actionButton = screen.getByText('Primary Action');
      fireEvent.click(actionButton);
      
      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith({ type: 'primary' });
      });
    });

    it('handles action button click with user events', async () => {
      const user = userEvent.setup();
      const mockOnAction = jest.fn().mockResolvedValue();
      
      render(<ComponentTemplate {...defaultProps} onAction={mockOnAction} />);
      
      const actionButton = screen.getByText('Primary Action');
      await user.click(actionButton);
      
      expect(mockOnAction).toHaveBeenCalledWith({ type: 'primary' });
    });

    it('does not crash when onAction is not provided', () => {
      render(<ComponentTemplate {...defaultProps} onAction={null} />);
      
      const actionButton = screen.getByText('Primary Action');
      
      expect(() => {
        fireEvent.click(actionButton);
      }).not.toThrow();
    });
  });

  describe('PropTypes and Default Props', () => {
    it('uses default title when not provided', () => {
      render(<ComponentTemplate data={mockData} />);
      
      expect(screen.getByText('Default Title')).toBeInTheDocument();
    });

    it('uses default empty array for data when not provided', () => {
      render(<ComponentTemplate title="Test" />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('uses default false for isLoading when not provided', () => {
      render(<ComponentTemplate title="Test" />);
      
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<ComponentTemplate {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Test Component');
    });

    it('has accessible button', () => {
      render(<ComponentTemplate {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Primary Action' });
      expect(button).toBeInTheDocument();
    });

    it('has proper list structure for data', () => {
      render(<ComponentTemplate {...defaultProps} />);
      
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(mockData.length);
    });
  });

  describe('Component Lifecycle', () => {
    it('logs mount message in development', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<ComponentTemplate {...defaultProps} />);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'ComponentTemplate mounted with title:',
        'Test Component'
      );
      
      consoleSpy.mockRestore();
    });

    it('logs unmount message in development', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { unmount } = render(<ComponentTemplate {...defaultProps} />);
      unmount();
      
      expect(consoleSpy).toHaveBeenCalledWith('ComponentTemplate unmounted');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles data with missing ids', () => {
      const dataWithoutIds = [
        { name: 'Item 1' },
        { name: 'Item 2' },
      ];
      
      render(<ComponentTemplate {...defaultProps} data={dataWithoutIds} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('handles very long titles', () => {
      const longTitle = 'A'.repeat(100);
      
      render(<ComponentTemplate {...defaultProps} title={longTitle} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      
      render(<ComponentTemplate {...defaultProps} data={largeData} />);
      
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 999')).toBeInTheDocument();
    });
  });
});