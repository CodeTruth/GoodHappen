import type { UserConfigExport } from '@tarojs/cli';
export default {
  logger: {
    quiet: false,
    stats: true,
  },
  mini: {},
  h5: {
    publicPath: '/',
    devServer: {
      host: '0.0.0.0',
      port: 10088,
      open: false,
    },
  },
} satisfies UserConfigExport<'webpack5'>;
