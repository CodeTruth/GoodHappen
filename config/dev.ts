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
      open: false,
    },
  },
} satisfies UserConfigExport<'webpack5'>;
