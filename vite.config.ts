import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const host = env.DEV_SERVER_HOST || '0.0.0.0';
  const port = Number(env.DEV_SERVER_PORT || 18080);

  // Ollama 서버 주소 결정 (환경별로 다름)
  const ollamaTarget = env.VITE_OLLAMA_PROXY_TARGET ||
    (process.platform === 'win32'
      ? 'http://172.22.42.12:11435'  // Windows → WSL IP로 직접 접근
      : 'http://host.docker.internal:11435'  // WSL/Linux → 내부 Docker 접근
    );

  const allowed = (env.DEV_ALLOWED_HOSTS || 'localhost')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const hmrHost = env.DEV_HMR_HOST || undefined;
  const hmrPort = env.DEV_HMR_PORT ? Number(env.DEV_HMR_PORT) : port;
  const hmrProtocol = env.DEV_HMR_PROTOCOL || 'ws';
  const hmrClientPort = env.DEV_HMR_CLIENT_PORT
    ? Number(env.DEV_HMR_CLIENT_PORT)
    : undefined;

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/f9d07d38f0acec59ac606b39b181a4ae8fbe1cd1.png': path.resolve(
          __dirname,
          './src/assets/f9d07d38f0acec59ac606b39b181a4ae8fbe1cd1.png'
        ),
        'figma:asset/4510f7fccec88b7d96239af9f1cbab26b3e402cd.png': path.resolve(
          __dirname,
          './src/assets/4510f7fccec88b7d96239af9f1cbab26b3e402cd.png'
        ),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
    },
    server: {
      host: '0.0.0.0', // 모든 인터페이스에서 접근 허용
      port: 18080,
      open: false,
      allowedHosts: allowed, // WSL IP도 허용
      hmr: {
        host: process.env.DEV_HMR_HOST,         // zipbuntu.iptime.org
        port: process.env.DEV_HMR_PORT ? Number(process.env.DEV_HMR_PORT) : 18080,
        protocol: process.env.DEV_HMR_PROTOCOL || 'ws',
        clientPort: process.env.DEV_HMR_CLIENT_PORT
          ? Number(process.env.DEV_HMR_CLIENT_PORT)
          : undefined,
      },
      strictPort: true, // (선택) 포트 점유 시 바로 실패
      proxy: {
        // Ollama API 전체 프록시 - 모든 /api/ 경로를 Ollama로 프록시
        '/api/': {
          target: ollamaTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          configure: (proxy, options) => {
            console.log(`🎯 Ollama proxy target: ${ollamaTarget}`);
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`🔄 Proxying ${req.method} ${req.url} to ${ollamaTarget}`);
              console.log(`📤 Headers:`, req.headers);

              // Content-Type 헤더 강제 설정
              if (req.method === 'POST') {
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Accept', 'application/json');
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`✅ Ollama response ${proxyRes.statusCode} for ${req.url}`);
              if (proxyRes.statusCode !== 200) {
                console.log(`📥 Response headers:`, proxyRes.headers);
              }
            });
            proxy.on('error', (err, req, res) => {
              console.error(`❌ Proxy error for ${req.url}:`, err.message);
            });
          }
        }
      }
    },
  };
});
