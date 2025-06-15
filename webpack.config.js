// webpack.config.js
import webpack from "webpack";
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Webpack will output to:", path.resolve(__dirname, "dist"));

import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default {
  entry: "./client/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "/",
    clean: true,
  },
  mode: "development",
  devtool: "source-map",
  devServer: {
    static: path.resolve(__dirname, "dist"),
    port: 3000,
    historyApiFallback: true,
    hot: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$|\.scss$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
    fallback: {
      process: require.resolve("process/browser.js"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
      inherits: require.resolve("inherits"),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./client/index.html",
    }),
    new webpack.ProvidePlugin({
      process: "process/browser.js",
    }),
  ],
};
