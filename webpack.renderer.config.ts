import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// Füge eine Regel für TypeScript und TSX-Dateien hinzu
rules.push({
  test: /\.(ts|tsx)$/, // Unterstützt TypeScript und TSX (React)
  exclude: /node_modules/,
  use: {
    loader: 'ts-loader',
  },
});

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.js$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader', // Or ts-loader if you're using TypeScript
  },
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'], // Unterstützte Dateiendungen
  },
};
