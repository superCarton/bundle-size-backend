import * as  TerserPlugin from 'terser-webpack-plugin';
import * as  MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as autoprefixer from 'autoprefixer';
import { resolve } from 'path';
import * as WriteFilePlugin from 'write-file-webpack-plugin';
import * as escapeRegex from 'escape-string-regexp';

/**
 * Webpack configuration allowing to compute the bundle size for prod environment
 * @param entry 
 * @param externals 
 * @param installFolder 
 */
export function makeWebpackConfig(entry, externals, installFolder) {
  const externalsRegex = makeExternalsRegex(externals.externalPackages)
  const isExternalRequest = (request) => {
    const isPeerDep = externals.externalPackages.length ? externalsRegex.test(request) : false
    const isBuiltIn = externals.externalBuiltIns.includes(request)
    return isPeerDep || isBuiltIn
  }

  return {
    entry: entry,
    mode: 'production',
    optimization: {
      namedChunks: true,
      runtimeChunk: { name: 'runtime' },
      splitChunks: {
        cacheGroups: {
          styles: {
            name: 'main',
            test: /\.css$/,
            chunks: 'all',
            enforce: true,
          },
        },
      },
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            ie8: false,
            output: {
              comments: false,
            },
          },
        })
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: '[name].bundle.css',
        chunkFilename: '[id].bundle.css',
      }),
      new WriteFilePlugin()
    ],
    resolve: {
      modules: [resolve(installFolder, 'node_modules')],
      symlinks: false,
      cacheWithContext: false,
      extensions: [
        '.web.mjs',
        '.mjs',
        '.web.js',
        '.js',
        '.mjs',
        '.json',
        '.css',
        '.sass',
        '.scss',
      ],
      mainFields: ['browser', 'module', 'main', 'style'],
    },
    module: {
      noParse: [/\.min\.js$/],
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        // see https://github.com/apollographql/react-apollo/issues/1737
        {
          type: 'javascript/auto',
          test: /\.mjs$/,
          use: [],
        },
        {
          test: /\.js$/,
          use: ['shebang-loader'], // support CLI tools that start with a #!/usr/bin/node
        },
        {
          test: /\.(scss|sass)$/,
          loader: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [
                  autoprefixer({
                    browsers: [
                      'last 5 Chrome versions',
                      'last 5 Firefox versions',
                      'Safari >= 8',
                      'Explorer >= 10',
                      'edge >= 12',
                    ],
                  }),
                ],
              },
            },
            'sass-loader',
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|svg|png|jpeg|jpg|gif|webp)$/,
          loader: 'file-loader',
          query: {
            emitFile: true,
          },
        },
      ],
    },
    // node: builtInNode,
    output: {
      filename: 'bundle.js',
      path: resolve(installFolder, 'dist')
    },
    externals: (context, request, callback) =>
      isExternalRequest(request) ? callback(null, 'commonjs ' + request) : callback()
  }
}

function makeExternalsRegex(externals) {
  let externalsRegex = externals
    .map(dep => `^${escapeRegex(dep)}$|^${escapeRegex(dep)}\\/`)
    .join('|')

  externalsRegex = `(${externalsRegex})`

  return new RegExp(externalsRegex)
}
