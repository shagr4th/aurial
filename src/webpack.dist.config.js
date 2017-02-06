var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  target: "web",
  entry: path.resolve(__dirname, 'js'),
  output: {
    path: path.resolve(__dirname, '..', 'dist'),
    filename: 'index.js'
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        dead_code: true
      }
    }),
    new HtmlWebpackPlugin({
      title: 'Aurial',
      template: 'src/index.html'
    }),
    new CopyWebpackPlugin([{
      from: 'src/css',
      to: 'css'
    }])
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          "plugins": [
            "transform-react-inline-elements"
          ],
          "presets": ["es2015", "stage-0", "react"]
        }
      }
    ]
  }
};
