const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'webpack-build.min.js',
    path: path.resolve(__dirname, ''),
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/, //any js files
        use: {
          loader: "babel-loader",
          options:{
              presets: ['@babel/env'],
          }
        },
      },
    ],
  },
  mode:'production',
  plugins:[
    //new CleanWebpackPlugin(),
  ]
};