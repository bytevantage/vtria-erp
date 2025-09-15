import React, { ReactElement } from 'react';
// import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// const customRender = (
//   ui: ReactElement,
//   options?: Omit<RenderOptions, 'wrapper'>
// ) => render(ui, { wrapper: AllTheProviders, ...options });

// export * from '@testing-library/react';
// export { customRender as render };

// Temporary placeholder exports
export const customRender = () => null;
export const render = () => null;