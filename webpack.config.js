const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "build"),
    publicPath: "/",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html")
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "build"),
    },
    port: 3001,
    hot: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.(ts|tsx)$/,
        use: ["ts-loader"],
      },
    ],
  },
  resolve: {
    extensions: ["*", ".js", ".jsx", ".ts", ".tsx"],
    alias: {
      "@style": path.resolve(__dirname, "src/", "style/"),
      "@comp": path.resolve(__dirname, "src/", "components/"),
      "@type": path.resolve(__dirname, "src/", "types/"),
      "@store": path.resolve(__dirname, "src/", "store/"),
    }
  },
};