import type { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: Configuration = {
  mode: 'production',
  entry: './src/renderer.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/static'),
    filename: 'bundle.js',
    publicPath: 'auto',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // weitere Loader für Assets (z.B. Bilder, Fonts) nach Bedarf ergänzen
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index_node.html',
      filename: 'index.html',
    }),
  ],
};


export default config;