const path = require('path');

const wrapWithDefaultModule = (config) => {
  return {
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
          },
        },
        {
          test: /\.js$/,
          enforce: 'pre',
          loader: 'source-map-loader',
        },
        {
          test: /\.scss$/i,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
          loader: 'url-loader',
          options: {
            limit: 8192,
          },
        },
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    ...config
  }
}

module.exports = [
  wrapWithDefaultModule({
    entry: './src/main/frontend/pipeline-graph-view',
    output: {
      path: path.resolve(__dirname, 'src/main/webapp/js'),
      filename: 'pipeline-graph-view-bundle.js',
    }
  }),
  wrapWithDefaultModule({
    entry: './src/main/frontend/pipeline-console-view',
    output: {
      path: path.resolve(__dirname, 'src/main/webapp/js'),
      filename: 'pipeline-console-view-bundle.js',
    }
  }),
  wrapWithDefaultModule({
    entry: './src/main/frontend/multi-pipeline-graph-view',
    output: {
      path: path.resolve(__dirname, 'src/main/webapp/js'),
      filename: 'multi-pipeline-graph-view-bundle.js',
    }
  }),
];
