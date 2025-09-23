import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ABTestingForm } from './ab-testing-form';
import userEvent from '@testing-library/user-event';

// Mock the TokenEstimator component
vi.mock('./token-estimator', () => ({
  TokenEstimator: ({ prompt, userContext, models }) => (
    <div data-testid="token-estimator">
      <div data-testid="prompt-content">{prompt}</div>
      <div data-testid="user-context">{userContext}</div>
      <div data-testid="models">{models.join(',')}</div>
    </div>
  )
}));

// Mock the fetch function
global.fetch = vi.fn();

// Mock the storage context
vi.mock('@/contexts/storage-context', () => ({
  useStorage: () => ({
    versions: {
      promptGroups: [],
      addVersion: vi.fn(),
      createPromptGroup: vi.fn().mockResolvedValue({ id: 'group-1' }),
    }
  })
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('ABTestingForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup fetch mock to return successful responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true,
        variations: [
          { id: 'var-1', content: 'Test variation 1', selectedModel: 'googleai/gemini-1.5-pro' },
          { id: 'var-2', content: 'Test variation 2', selectedModel: 'googleai/gemini-1.5-flash' },
          { id: 'var-3', content: 'Test variation 3', selectedModel: 'googleai/gemini-pro' }
        ]
      })
    });
  });
  
  it('renders the component with both base prompt and user context fields', () => {
    render(<ABTestingForm />);
    
    // Check for both input fields
    expect(screen.getByLabelText(/base prompt/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user context/i)).toBeInTheDocument();
  });
  
  it('allows typing in both base prompt and user context fields', async () => {
    render(<ABTestingForm />);
    
    const basePromptField = screen.getByLabelText(/base prompt/i);
    const userContextField = screen.getByLabelText(/user context/i);
    
    // Type in both fields
    await userEvent.type(basePromptField, 'Test base prompt');
    await userEvent.type(userContextField, 'Test user context');
    
    // Check values were entered
    expect(basePromptField).toHaveValue('Test base prompt');
    expect(userContextField).toHaveValue('Test user context');
  });
  
  it('shows the token estimator when toggled in variations tab', async () => {
    render(<ABTestingForm />);
    
    // Initially, token estimator should not be visible
    expect(screen.queryByTestId('token-estimator')).not.toBeInTheDocument();
    
    // Click the toggle button to show estimator
    const toggleButton = screen.getByText(/show token estimator/i);
    await userEvent.click(toggleButton);
    
    // Now token estimator should be visible
    expect(screen.getByTestId('token-estimator')).toBeInTheDocument();
    
    // Toggle again to hide
    await userEvent.click(screen.getByText(/hide token estimator/i));
    
    // Token estimator should be hidden again
    expect(screen.queryByTestId('token-estimator')).not.toBeInTheDocument();
  });
  
  it('passes both base prompt and user context to the API when generating variations', async () => {
    render(<ABTestingForm />);
    
    // Fill in the form
    await userEvent.type(screen.getByLabelText(/base prompt/i), 'Test base prompt');
    await userEvent.type(screen.getByLabelText(/user context/i), 'Test user context');
    
    // Submit the form
    const submitButton = screen.getByText(/generate variations/i);
    await userEvent.click(submitButton);
    
    // Wait for the fetch call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    // Verify the fetch call includes both basePrompt and userContext
    const [url, options] = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(options.body);
    
    expect(url).toBe('/api/ab-testing');
    expect(requestBody.basePrompt).toBe('Test base prompt');
    expect(requestBody.userContext).toBe('Test user context');
  });
  
  it('switches between variations and models tabs', async () => {
    render(<ABTestingForm />);
    
    // Default is variations tab
    expect(screen.getByText(/number of variations/i)).toBeInTheDocument();
    
    // Switch to models tab
    const modelsTab = screen.getByRole('tab', { name: /model comparison/i });
    await userEvent.click(modelsTab);
    
    // Should now show models section
    expect(screen.getByText(/select models to compare/i)).toBeInTheDocument();
    expect(screen.queryByText(/number of variations/i)).not.toBeInTheDocument();
    
    // Switch back to variations
    const variationsTab = screen.getByRole('tab', { name: /multi-variant testing/i });
    await userEvent.click(variationsTab);
    
    // Should show variations section again
    expect(screen.getByText(/number of variations/i)).toBeInTheDocument();
  });
  
  it('displays token estimator with correct props in models tab', async () => {
    render(<ABTestingForm />);
    
    // Fill in the form
    await userEvent.type(screen.getByLabelText(/base prompt/i), 'Test base prompt');
    await userEvent.type(screen.getByLabelText(/user context/i), 'Test user context');
    
    // Switch to models tab
    const modelsTab = screen.getByRole('tab', { name: /model comparison/i });
    await userEvent.click(modelsTab);
    
    // Token estimator should be visible by default in models tab
    const tokenEstimator = screen.getByTestId('token-estimator');
    expect(tokenEstimator).toBeInTheDocument();
    
    // Check props are passed correctly
    expect(screen.getByTestId('prompt-content')).toHaveTextContent('Test base prompt');
    expect(screen.getByTestId('user-context')).toHaveTextContent('Test user context');
  });
  
  it('generates variations and displays results', async () => {
    render(<ABTestingForm />);
    
    // Fill in the form
    await userEvent.type(screen.getByLabelText(/base prompt/i), 'Test base prompt');
    
    // Submit the form
    const submitButton = screen.getByText(/generate variations/i);
    await userEvent.click(submitButton);
    
    // Wait for the results to be displayed
    await waitFor(() => {
      expect(screen.getByText(/results/i)).toBeInTheDocument();
      expect(screen.getAllByText(/variation/i).length).toBeGreaterThan(1);
    });
    
    // Check for evaluation button
    expect(screen.getByText(/auto-evaluate results/i)).toBeInTheDocument();
  });
});