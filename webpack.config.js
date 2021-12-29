const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: ['babel-regenerator-runtime','./src/index.js'],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/',
  },
  module: {
    
  },
  mode:'development',
  //mode:'production',
  plugins:[
    new CleanWebpackPlugin(),
  ]
};