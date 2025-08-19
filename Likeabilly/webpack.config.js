const path = require('path');

module.exports = {
  entry: './src/index.tsx',  // startpunt van de applicatie
  output: {
    filename: 'bundle.js',   // de outputbundle die je in index.html laadt
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],  // los .tsx en .ts op
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',  // of babel-loader met de juiste presets
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,  // als je met client-side routing werkt
  },
  mode: 'development'  // of 'production' voor een productie build
};