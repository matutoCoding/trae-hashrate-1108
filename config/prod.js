module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
  },
  mini: {},
  h5: {
    /**
     * 如果h5端编译后体积过大，可以使用webpack-bundle-analyzer对打包体积进行分析。
     * @docs https://taro-docs.jd.com/docs/next/config-detail#minibundleanalyzerplugin
     */
    // webpackChain(chain, webpack) {
    //   chain.plugin('analyzer')
    //     .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, [])
    // }
  }
}
