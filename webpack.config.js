const path = require('path');

module.exports = [
  {
    entry: './src/main/frontend/pipeline-graph-view',
    output: {
      path: path.resolve(__dirname, 'src/main/webapp/js'),
      filename: 'pipeline-graph-view-bundle.js',
    },
    // enable source maps for debugging webpack output
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
    }
  },
  {
    entry: './src/main/frontend/pipeline-console-view',
    output: {
      path: path.resolve(__dirname, 'src/main/webapp/js'),
      filename: 'pipeline-console-view-bundle.js',
    },
    // enable source maps for debugging webpack output
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
    }
  },
  {
    entry: './src/main/frontend/multi-pipeline-graph-view',
    output: {
      path: path.resolve(__dirname, 'src/main/webapp/js'),
      filename: 'multi-pipeline-graph-view-bundle.js',
    },
    // enable source maps for debugging webpack output
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
    }
  }
];
