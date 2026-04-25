import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider
        defaultColorScheme="dark"
        theme={{
          primaryColor: 'indigo',
          fontFamily: 'Inter, Noto Sans KR, sans-serif',
          components: {
            AppShell: {
              styles: {
                main: { background: '#0f1117' },
              },
            },
          },
        }}
      >
        <Notifications position="top-right" zIndex={9999} />
        <App />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
)
