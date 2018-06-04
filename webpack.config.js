/*jslint node: true*/
module.exports = {
    entry: ['./js/main.js', './css/style.css'],
    output: {
        filename: 'bundle.js',
        publicPath: 'dist/'
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: ["style-loader", "css-loader?minimize=true"]
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file-loader',
                options: {
                    name: 'fonts/[name].[ext]'
                }
            },
            {
                test: /\.(png|gif)$/,
                loader: 'file-loader',
                options: {
                    name: 'img/[name].[ext]'
                }
            }
        ]
    }
};
